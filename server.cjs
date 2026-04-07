/**
 * KitsunePaint Express Server
 *
 * Serves the Vite-built frontend and provides a /api/build-bundle endpoint
 * that wraps the Python bundle builder. This lets users download modlets with
 * pre-built .unity3d bundles without needing Python installed locally.
 */

const express = require('express')
const multer = require('multer')
const { execFile } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

const app = express()
const PORT = process.env.PORT || 3002

// CORS for cross-port requests (Apache on 80/443, Express on 3002)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
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
app.post('/api/build-bundle', upload.fields([
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
      execFile('python3', ['-X', 'utf8', scriptPath, tempDir, templatePath], {
        timeout: 30000,
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
