/**
 * Maps technical error messages into something a user can actually read.
 * Returns both a short headline and a longer body. The full original
 * error always goes to console.error for debugging ~ never to the UI.
 *
 * Pattern matching is intentionally loose: substring checks on the
 * message text. That keeps it robust to wrapping (e.g. errors that
 * come back through a "Bundle build failed for X:" prefix).
 */

export interface FriendlyError {
  /** Short heading for the error dialog. Under ~40 chars. */
  title: string
  /** 1-3 sentence explanation. Plain English, no jargon. */
  body: string
  /** What button should say. Defaults vary by recovery hint. */
  action?: string
}

/**
 * Each entry: match the message (case-insensitive substring or regex),
 * return a friendly version. Order matters ~ first match wins.
 */
const PATTERNS: { match: RegExp | string; build: (raw: string) => FriendlyError }[] = [
  // Non-square source ~ the most common one. Server-side check.
  {
    match: /non-?square source/i,
    build: () => ({
      title: 'That image isn\'t square',
      body: 'Paint textures need to be 1:1 (same width and height). I usually pop a cropper for you ~ if you got here, it means I missed the case. Try re-uploading and you should see the crop dialog.',
      action: 'OK, I\'ll re-upload',
    }),
  },

  // Server timeout / 504 / network failure
  {
    match: /timeout|timed out|504|gateway|fetch failed|network/i,
    build: () => ({
      title: 'The server\'s being slow today',
      body: 'The bundle build took longer than expected. Sometimes the server is just chugging through other people\'s builds. Wait a few seconds and try again ~ usually that clears it up.',
      action: 'Try again',
    }),
  },

  // 429 rate-limit
  {
    match: /429|rate.?limit/i,
    build: () => ({
      title: 'You\'re going fast!',
      body: 'You\'ve hit the rate limit for the bundle builder. This protects the shared server from being overwhelmed. Wait a minute and try again, or grab the DIY kit from the landing page to build packs offline.',
      action: 'OK, I\'ll wait',
    }),
  },

  // 500 from server with no specific signal
  {
    match: /500|internal server/i,
    build: (raw) => ({
      title: 'Something broke server-side',
      body: `The bundle server hit an error we haven't seen before. The technical details (kept short): "${raw.slice(0, 120)}". You can try again ~ if it keeps happening please open a bug report (footer link) and I'll take a look.`,
      action: 'Try again',
    }),
  },

  // Corrupt/unreadable image
  {
    match: /cannot identify image|broken|truncated|invalid.*image/i,
    build: () => ({
      title: 'That image file looks corrupted',
      body: 'I couldn\'t read the image you uploaded. Try saving it again from your editor (PNG or JPG), or pick a different source file.',
      action: 'OK',
    }),
  },

  // Pillow / PIL specific
  {
    match: /UnidentifiedImageError/i,
    build: () => ({
      title: 'Unrecognized image format',
      body: 'I couldn\'t open that image. PNG and JPG work best ~ exotic formats (WebP, AVIF, HEIC, etc.) sometimes don\'t survive the trip to the server.',
      action: 'OK',
    }),
  },
]

export function toFriendlyError(err: unknown): FriendlyError {
  const raw = err instanceof Error ? err.message : String(err)

  for (const pattern of PATTERNS) {
    const matched = pattern.match instanceof RegExp
      ? pattern.match.test(raw)
      : raw.toLowerCase().includes(pattern.match.toLowerCase())
    if (matched) return pattern.build(raw)
  }

  // Generic fallback ~ at least don't show a stack trace
  const firstLine = raw.split('\n').find((l) => l.trim() && !l.startsWith('  '))
  return {
    title: 'Something went wrong',
    body: `${(firstLine || raw).slice(0, 200)}\n\nIf this keeps happening please open a bug report (footer link).`,
    action: 'Try again',
  }
}
