/**
 * Shared API key auth helpers. Used by both server.cjs (request validation)
 * and scripts/manage-keys.cjs (CLI admin tool). Pure functions only ~ no
 * Express, no I/O side effects beyond the key file read/write.
 *
 * Threat model:
 *   - api-keys.json file leaks → attacker has hashes only. With a 192-bit
 *     random key and SHA-256 + secret salt, brute-forcing a single key is
 *     computationally infeasible.
 *   - API_KEY_SALT env leaks → same as above; still needs hashes AND the
 *     key entropy is too high to brute force.
 *   - Both leak → still can't generate valid keys without the original
 *     plaintext (which we never stored). Rotate everything if both leak.
 *   - One customer's key leaks → only that customer is compromised. Use
 *     `manage-keys revoke <label>` to invalidate.
 *
 * Hashing choice: plain SHA-256 with a server-side secret salt. The
 * bcrypt-style per-key salt pattern is for low-entropy passwords. Our keys
 * are 32 random base64url chars (~192 bits) so a global salt suffices.
 *
 * Timing safety: hash comparisons use crypto.timingSafeEqual to avoid
 * leaking which prefix bytes match via response time.
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const KEY_FILE = path.join(__dirname, 'data', 'api-keys.json')
const KEY_PREFIX = 'kp_live_'
const KEY_RANDOM_BYTES = 24 // 24 bytes → 32 base64url chars

/**
 * Pull the secret salt from the environment. Crashes loudly if missing
 * because running without a salt would silently store hashes that any
 * future installer could collide with by guessing an empty salt.
 */
function getSalt() {
  const salt = process.env.API_KEY_SALT
  if (!salt || salt.length < 16) {
    throw new Error(
      'API_KEY_SALT environment variable missing or too short (need >=16 chars). Generate with: openssl rand -hex 32',
    )
  }
  return salt
}

/**
 * Hash a plaintext API key into the form we store on disk. SHA-256 of
 * "<salt>:<key>" returned as hex. Deterministic for a given salt+key,
 * so we can look up by hashing the incoming header value and comparing.
 */
function hashKey(plaintext) {
  return crypto
    .createHash('sha256')
    .update(getSalt() + ':' + plaintext)
    .digest('hex')
}

/**
 * Generate a fresh random API key. Returned plaintext should be shown
 * to the operator ONCE and emailed to the customer ~ we never persist it.
 */
function generateKey() {
  return KEY_PREFIX + crypto.randomBytes(KEY_RANDOM_BYTES).toString('base64url')
}

/**
 * Read the keys store. Returns [] if the file doesn't exist yet.
 * File format: array of { hash, label, createdAt, lastUsed? }.
 */
function loadKeys() {
  if (!fs.existsSync(KEY_FILE)) return []
  try {
    return JSON.parse(fs.readFileSync(KEY_FILE, 'utf-8'))
  } catch (err) {
    throw new Error(`Failed to read ${KEY_FILE}: ${err.message}`)
  }
}

/**
 * Write the keys store atomically (write to temp, then rename) so a
 * crashed write doesn't leave a half-written JSON file.
 */
function saveKeys(keys) {
  fs.mkdirSync(path.dirname(KEY_FILE), { recursive: true })
  const tmp = KEY_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(keys, null, 2))
  fs.renameSync(tmp, KEY_FILE)
}

/**
 * Constant-time check: does the incoming header value match any stored
 * hash? Returns the matching entry (so caller can update lastUsed) or
 * null if no match.
 */
function verifyKey(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') return null
  if (!plaintext.startsWith(KEY_PREFIX)) return null

  const incomingHash = hashKey(plaintext)
  const incomingBuf = Buffer.from(incomingHash, 'hex')

  const keys = loadKeys()
  for (const entry of keys) {
    const storedBuf = Buffer.from(entry.hash, 'hex')
    if (storedBuf.length !== incomingBuf.length) continue
    if (crypto.timingSafeEqual(storedBuf, incomingBuf)) return entry
  }
  return null
}

/**
 * Mark a key as used. Best-effort ~ swallows errors so a write hiccup
 * never breaks the actual API request.
 */
function touchLastUsed(label) {
  try {
    const keys = loadKeys()
    const entry = keys.find((k) => k.label === label)
    if (!entry) return
    entry.lastUsed = new Date().toISOString()
    saveKeys(keys)
  } catch (_) { /* non-critical */ }
}

module.exports = {
  KEY_FILE,
  KEY_PREFIX,
  generateKey,
  hashKey,
  loadKeys,
  saveKeys,
  verifyKey,
  touchLastUsed,
}
