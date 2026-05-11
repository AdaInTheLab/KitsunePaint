/**
 * KitsunePaint Express Server
 *
 * Serves the Vite-built frontend and provides a /api/build-bundle endpoint
 * that wraps the Python bundle builder. This lets users download modlets with
 * pre-built .unity3d bundles without needing Python installed locally.
 */

const express = require('express')
const multer = require('multer')
const rateLimit = require('express-rate-limit')
const { execFile } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

const app = express()
const PORT = process.env.PORT || 3002

// Behind Caddy reverse proxy ~ trust the X-Forwarded-For header so req.ip
// resolves to the real client, not 127.0.0.1. Without this, every request
// would look like loopback and the rate limiter would treat all callers
// as the same IP (i.e. instantly block everyone).
app.set('trust proxy', 'loopback')

/**
 * Origins allowed to call the API. Same-origin requests (browser hitting
 * /api/* on the same host that served the page) don't actually need CORS,
 * but we include the prod domain so iframes/embeds from elsewhere on the
 * Kitsune Den ecosystem still work, and localhost for dev.
 *
 * Add new entries here; everything else gets blocked.
 */
const ALLOWED_ORIGINS = new Set([
  'https://paint.kitsuneden.net',
  'http://localhost:5173',
  'http://localhost:3002',
])

/**
 * Returns true if the request's Origin header (or, for non-preflight POSTs,
 * the Referer's origin) is in the allow-list. Used both to gate write
 * endpoints and to decide whether to send CORS-allow headers back.
 *
 * Note: this only stops *browser-based* abuse (other sites embedding our
 * API in their JS). It does NOT stop direct curl/Python hits ~ those are
 * handled by the rate limiter further down. Real auth would require
 * tokens, which is overkill for a free public tool.
 */
function isAllowedOrigin(req) {
  const origin = req.headers.origin
  if (origin) return ALLOWED_ORIGINS.has(origin)

  // Some same-origin POSTs don't send Origin. Fall back to Referer.
  const referer = req.headers.referer
  if (referer) {
    try {
      return ALLOWED_ORIGINS.has(new URL(referer).origin)
    } catch (_) { /* malformed referer */ }
  }
  return false
}

app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    // Echo back the specific origin (not '*'). Required when also
    // sending Access-Control-Allow-Credentials, and just generally a
    // tighter contract than the wildcard.
    res.header('Access-Control-Allow-Origin', origin)
    res.header('Vary', 'Origin')
    res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Content-Type')
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

// API key auth ~ valid X-API-Key bypasses the Origin check below. See
// auth.cjs for the hash/lookup logic and scripts/manage-keys.cjs for
// the admin CLI.
const auth = require('./auth.cjs')

/**
 * Hard-block POST traffic that:
 *   1. has no valid X-API-Key, AND
 *   2. doesn't claim to come from an allowed origin
 *
 * API key path is for paid integrators ~ they get past the Origin check
 * because they paid for non-browser access (server-to-server, custom
 * tooling, etc). The Origin path covers our own frontend at
 * paint.kitsuneden.net plus localhost dev.
 *
 * CORS alone only stops browsers; the Origin check also stops curl/
 * scripts that forget to spoof a header. Spoofing the Origin header
 * is trivial, but combined with the rate limiter it raises the floor
 * on casual abuse. For unspoofable access, customers use API keys.
 */
app.use((req, res, next) => {
  if (req.method !== 'POST') return next()

  // Try API key first
  const apiKey = req.headers['x-api-key']
  if (apiKey) {
    const match = auth.verifyKey(apiKey)
    if (match) {
      auth.touchLastUsed(match.label)
      // Tag the request so endpoints can log/meter per customer if needed
      req.apiKeyLabel = match.label
      return next()
    }
    // Header was provided but didn't match ~ explicit 401, NOT 403,
    // so callers can distinguish "your key is bad" from "you have no key"
    return res.status(401).json({
      error: 'Invalid X-API-Key. If your key was revoked or rotated, email adainthelab@gmail.com.',
    })
  }

  // No API key ~ fall back to Origin check
  if (isAllowedOrigin(req)) return next()
  return res.status(403).json({
    error: 'This API only accepts requests from paint.kitsuneden.net. If you want to build packs offline, grab the free DIY kit from the landing page. For paid whitelisted API access, email adainthelab@gmail.com.',
  })
})

// Rate limiter for the bundle build endpoint. Each Python subprocess takes
// ~2 seconds and runs serially, so a single automated caller flooding the
// endpoint can choke real users. Cap at 50 builds/hour per IP ~ a heavy
// 7DTD modder building a 23-paint pack hits ~23/hour, comfortable headroom.
// Automated bulk callers exceeding 50 should slow down or batch differently.
const buildLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      'Rate limit hit ~ max 50 bundle builds per hour. ' +
      'Try again in a bit, or grab the DIY kit and run the same compiler ' +
      'locally with no caps: https://paint.kitsuneden.net/KitsunePaint-DIY-Kit.zip',
  },
  // Log every 429 we issue so `journalctl -u kitsunepaint | grep rate-limit`
  // surfaces blocked callers. Useful for spotting masonic-style bursts and
  // for confirming the limiter is actually doing its job.
  handler: (req, res, _next, options) => {
    const ua = req.headers['user-agent'] || 'no-ua'
    const ref = req.headers['referer'] || 'no-referer'
    console.warn(
      `[rate-limit] 429 for ip=${req.ip} ua="${ua}" referer="${ref}"`,
    )
    res.status(options.statusCode).json(options.message)
  },
})

// Serve static frontend
app.use(express.static(path.join(__dirname, 'dist')))

// Multer stores uploads in temp dir
const upload = multer({ dest: os.tmpdir() })

/**
 * POST /api/build-bundle
 *
 * Receives texture files (diffuse required, normal/specular optional) and a paint name.
 * Runs build_bundle.py to produce a .unity3d asset bundle.
 * Returns the binary bundle file.
 */
app.post('/api/build-bundle', buildLimiter, upload.fields([
  { name: 'diffuse', maxCount: 1 },
  { name: 'normal', maxCount: 1 },
  { name: 'specular', maxCount: 1 },
]), async (req, res) => {
  const paintName = req.body?.name || 'paint'
  const safeName = paintName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')

  // Create a temp Resources dir matching build_bundle.py's expected layout
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kitsunepaint-'))
  const cleanup = () => fs.rmSync(tempDir, { recursive: true, force: true })

  try {
    // Copy uploaded files with the naming convention build_bundle.py expects
    const diffuseFile = req.files?.diffuse?.[0]
    if (!diffuseFile) {
      cleanup()
      return res.status(400).json({ error: 'diffuse texture is required' })
    }

    fs.copyFileSync(diffuseFile.path, path.join(tempDir, `${safeName}_diffuse.png`))

    if (req.files?.normal?.[0]) {
      fs.copyFileSync(req.files.normal[0].path, path.join(tempDir, `${safeName}_normal.png`))
    }
    if (req.files?.specular?.[0]) {
      fs.copyFileSync(req.files.specular[0].path, path.join(tempDir, `${safeName}_specular.png`))
    }

    // Run the Python bundle builder
    const scriptPath = path.join(__dirname, 'scripts', 'build_bundle.py')
    const templatePath = path.join(__dirname, 'scripts', 'Atlas.template.unity3d')

    await new Promise((resolve, reject) => {
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'
      // --pack-id "" disables Python-side namespacing because the JS side
      // (buildModlet.ts) has already prefixed asset filenames with the pack ID
      // before uploading. A second prefix would produce double-prefixed paths.
      execFile(pythonCmd, ['-X', 'utf8', scriptPath, tempDir, templatePath, '--pack-id', ''], {
        // 120s — UnityPy bundle build on the ARM VPS can take 30-60s per
        // texture for larger images. The previous 30s budget caused silent
        // failures that made the client fall back to including raw PNGs
        // instead of the .unity3d bundle (see buildModlet.ts catch path).
        timeout: 120000,
      }, (error, stdout, stderr) => {
        if (error) {
          console.error('[build-bundle] Python error:', stderr || error.message)
          reject(new Error(stderr || error.message))
        } else {
          console.log('[build-bundle]', stdout.trim())
          resolve()
        }
      })
    })

    // Find the built bundle (Atlas_001.unity3d)
    const bundlePath = path.join(tempDir, 'Atlas_001.unity3d')
    if (!fs.existsSync(bundlePath)) {
      cleanup()
      return res.status(500).json({ error: 'Bundle build produced no output' })
    }

    // Log the build for analytics. Captures who/where/how alongside the what
    // so we can answer questions like "is this our frontend or a script
    // hitting the API directly?" and "is one IP responsible for a flood?".
    // Stored locally on disk only; not exposed via /api/stats.
    try {
      const logPath = path.join(__dirname, 'build-log.jsonl')
      const entry = JSON.stringify({
        timestamp: new Date().toISOString(),
        paintName: safeName,
        textures: Object.keys(req.files || {}),
        bundleSize: fs.statSync(bundlePath).size,
        userAgent: req.headers['user-agent'] || null,
        referer: req.headers['referer'] || null,
        ip: req.ip || null,
      })
      fs.appendFileSync(logPath, entry + '\n')
    } catch (_) { /* non-critical */ }

    // Send the binary bundle
    const bundleData = fs.readFileSync(bundlePath)
    res.set('Content-Type', 'application/octet-stream')
    res.set('Content-Disposition', `attachment; filename="Atlas_001.unity3d"`)
    res.send(bundleData)
  } catch (err) {
    console.error('[build-bundle] Failed:', err.message)
    res.status(500).json({ error: `Bundle build failed: ${err.message}` })
  } finally {
    // Clean up temp files (uploaded + build output)
    cleanup()
    for (const fieldFiles of Object.values(req.files || {})) {
      for (const f of fieldFiles) {
        fs.unlink(f.path, () => {})
      }
    }
  }
})

/**
 * GET /api/stats
 *
 * Returns build count and recent activity from the build log.
 */
app.get('/api/stats', (req, res) => {
  const logPath = path.join(__dirname, 'build-log.jsonl')
  if (!fs.existsSync(logPath)) {
    return res.json({ totalBuilds: 0, recentBuilds: [] })
  }
  try {
    const lines = fs.readFileSync(logPath, 'utf-8').trim().split('\n').filter(Boolean)
    const entries = lines.map(l => JSON.parse(l))
    // Scrub PII (userAgent / referer / ip) from anything we expose publicly.
    // Those fields exist in the on-disk log for our own analytics ~ they
    // shouldn't go out over a public stats endpoint.
    const recent = entries.slice(-10).reverse().map(e => ({
      timestamp: e.timestamp,
      paintName: e.paintName,
      textures: e.textures,
      bundleSize: e.bundleSize,
    }))
    res.json({ totalBuilds: entries.length, recentBuilds: recent })
  } catch (err) {
    res.status(500).json({ error: 'Failed to read build log' })
  }
})

// SPA fallback — serve index.html for all non-API routes (Express 5 syntax)
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

// If run directly (PM2 or standalone), listen on PORT
// If loaded by Passenger, export the app
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`KitsunePaint server running on http://localhost:${PORT}`)
  })
}
module.exports = app
