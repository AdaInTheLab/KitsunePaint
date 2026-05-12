/**
 * Lightweight request audit + spoof detection.
 *
 * Each tracked request gets a structured JSON log line to journald
 * (prefixed [AUDIT] or [AUDIT][SPOOF] for easy grep) AND is added to
 * an in-memory ring buffer that the /api/_admin/spoof-stats endpoint
 * reads from. Buffer survives until the service restarts; that's fine
 * because the journal has the durable copy.
 *
 * "Spoof" detection is a heuristic, not proof. A real attacker who
 * spoofs all the browser headers (User-Agent + Sec-Fetch-Site +
 * Accept-Language + Sec-Ch-Ua) will pass the check. But that's a
 * meaningfully higher effort than `curl -H "Origin: ..."` and the
 * whole point is to surface lazy spoofers in the dashboard so we
 * can see if it's actually happening.
 */

const BUFFER_SIZE = 2000

// Ring buffer of recent audit entries. Indexed by [tail, head); when
// the array reaches BUFFER_SIZE we shift the oldest off. Tradeoff: O(n)
// shift, but at 2k entries and rare access this is fine.
const buffer = []

/**
 * Real browsers reliably send:
 *   - User-Agent containing "Mozilla"
 *   - Sec-Fetch-Site (added by all major browsers since 2019)
 *   - Accept-Language
 *
 * Curl, requests, axios server-side, etc. don't send these unless
 * explicitly faked. So if Origin claims a real browser context but
 * these are missing, it's almost certainly not a real browser.
 */
function isLikelyBrowser(req) {
  const ua = req.headers['user-agent'] || ''
  const hasSecFetch = !!req.headers['sec-fetch-site']
  const hasAcceptLang = !!req.headers['accept-language']
  return ua.includes('Mozilla') && hasSecFetch && hasAcceptLang
}

/**
 * Returns true if the request claims a whitelisted Origin but doesn't
 * have the browser-fingerprint headers a real browser would send.
 */
function looksLikeSpoof(req, allowedOrigins) {
  const origin = req.headers.origin
  if (!origin) return false
  if (!allowedOrigins.has(origin)) return false
  return !isLikelyBrowser(req)
}

/**
 * Record one request. Called from a wrapper middleware after the
 * response sends. `result` is a short tag describing the outcome:
 * 'allowed' | 'blocked-origin' | 'blocked-key' | 'rate-limited' | 'error'
 */
function record(req, res, { result, durationMs, allowedOrigins }) {
  const entry = {
    ts: new Date().toISOString(),
    ip: req.ip,
    method: req.method,
    path: req.path,
    claimedOrigin: req.headers.origin || null,
    referer: req.headers.referer || null,
    userAgent: req.headers['user-agent'] || null,
    secFetchSite: req.headers['sec-fetch-site'] || null,
    apiKeyLabel: req.apiKeyLabel || null,
    looksSpoof: looksLikeSpoof(req, allowedOrigins),
    result,
    statusCode: res.statusCode,
    durationMs,
  }

  buffer.push(entry)
  if (buffer.length > BUFFER_SIZE) buffer.shift()

  // One-line JSON to journald. Prefix changes for easy grep.
  const prefix = entry.looksSpoof ? '[AUDIT][SPOOF]' : '[AUDIT]'
  // eslint-disable-next-line no-console
  console.log(`${prefix} ${JSON.stringify(entry)}`)
}

/**
 * Returns the audit buffer filtered to the last `windowMs` ms.
 * Used by the admin stats endpoint.
 */
function recent(windowMs) {
  const cutoff = Date.now() - windowMs
  return buffer.filter((e) => new Date(e.ts).getTime() >= cutoff)
}

/**
 * Aggregate stats over the buffer. Window is in milliseconds.
 */
function summarize(windowMs) {
  const entries = recent(windowMs)
  const spoofs = entries.filter((e) => e.looksSpoof)

  const ipCounts = new Map()
  for (const e of spoofs) {
    ipCounts.set(e.ip, (ipCounts.get(e.ip) || 0) + 1)
  }
  const topSpoofIps = [...ipCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([ip, count]) => ({ ip, count }))

  const resultCounts = {}
  for (const e of entries) {
    resultCounts[e.result] = (resultCounts[e.result] || 0) + 1
  }

  return {
    windowMs,
    totalRequests: entries.length,
    suspiciousCount: spoofs.length,
    suspiciousPercent: entries.length
      ? Math.round((spoofs.length / entries.length) * 100)
      : 0,
    resultCounts,
    topSpoofIps,
    bufferSize: buffer.length,
    bufferMax: BUFFER_SIZE,
  }
}

/**
 * Recent suspicious requests, full detail. Useful for "what was that
 * spoofer actually trying to do" investigation.
 */
function recentSpoofs(limit = 50) {
  return buffer.filter((e) => e.looksSpoof).slice(-limit).reverse()
}

/**
 * Express middleware that records every request that flows through it.
 * Mount BEFORE your auth/origin checks so we capture blocked requests
 * too ~ those are the most interesting ones for spoof detection.
 *
 * `getResult(req, res)` is called once the response is finished and
 * should return one of the result tags above. This lets the caller
 * distinguish 401/403/200/etc.
 */
function middleware({ allowedOrigins, getResult }) {
  return (req, res, next) => {
    const start = Date.now()
    res.on('finish', () => {
      try {
        record(req, res, {
          result: getResult(req, res),
          durationMs: Date.now() - start,
          allowedOrigins,
        })
      } catch (_) { /* never break a request because audit failed */ }
    })
    next()
  }
}

module.exports = {
  middleware,
  summarize,
  recentSpoofs,
  isLikelyBrowser,
  looksLikeSpoof,
}
