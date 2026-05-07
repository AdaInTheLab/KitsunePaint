import { useEffect, useState } from 'react'

/**
 * Pool of loading messages cycled on the building modal. One is picked at
 * random when the modal mounts, and a new (different) one is picked every
 * ~3.5s while the build is running. Keeps wait time feeling alive without
 * making any single trip through the build feel scripted.
 *
 * Add freely. Keep them under ~80 chars and lowercase-first to match voice.
 */
const LOADING_MESSAGES: string[] = [
  // warm "please wait" lane
  'please be patient, we\'re making your paints',
  'mixing the digital pigment',
  'hand-rolling each pixel with care',
  'the paints are almost ready',
  'baking textures into a Unity bundle',

  // in-on-the-joke technical lane
  'breaking the 255 cap (don\'t tell TFP)',
  'convincing the GPU this is fine',
  'negotiating with the texture atlas',
  'calibrating the UV coordinates',
  'warming up the material swap',
  'compiling the bundle (this part is genuinely slow lol)',
  'verifying you\'ve earned all 1023 paint slots',

  // lightly chaotic lane
  'adding a touch of chaos',
  'ensuring no paints are sus',
  'asking the zombies to wait their turn',
  'this is taking longer than a horde night',
  'whispering encouragement to the JSON',

  // kitsune-house-style lane
  'the kitsunes are working',
  'summoning the paint kitsune',
  'bribing the kitsune with snacks',
  'the kitsune is almost done',
]

/**
 * Pick a random index that isn't `excludeIdx`. If the pool has only one
 * entry, returns 0. Used to avoid immediately re-displaying the same
 * message when rotating.
 */
function pickRandomIdx(poolLength: number, excludeIdx: number): number {
  if (poolLength <= 1) return 0
  let next = excludeIdx
  while (next === excludeIdx) {
    next = Math.floor(Math.random() * poolLength)
  }
  return next
}

const ROTATE_MS = 3500

/**
 * Full-screen building modal. Replaces the previous gray "Building (1/2)..."
 * button text — that was indistinguishable from a stuck/broken UI. This
 * makes the wait feel intentional and tells the user they should wait.
 *
 * progress: free-form status string from buildModletZip (e.g. "Building typing (1/2)...")
 */
export function BuildingModal({ progress }: { progress: string }) {
  // Random message on mount, rotates every ROTATE_MS while modal is open.
  const [msgIdx, setMsgIdx] = useState(() =>
    Math.floor(Math.random() * LOADING_MESSAGES.length),
  )
  useEffect(() => {
    const id = setInterval(() => {
      setMsgIdx(prev => pickRandomIdx(LOADING_MESSAGES.length, prev))
    }, ROTATE_MS)
    return () => clearInterval(id)
  }, [])
  const flavorMessage = LOADING_MESSAGES[msgIdx]

  // Try to extract "X/Y" from the progress string for a numeric percent bar.
  const match = progress.match(/\((\d+)\/(\d+)\)/)
  const current = match ? parseInt(match[1], 10) : 0
  const total = match ? parseInt(match[2], 10) : 0
  const percent = total > 0 ? Math.round((current / total) * 100) : 0

  // Pull just the texture name out: "Building typing (1/2)..." → "typing"
  const nameMatch = progress.match(/Building\s+(.+?)\s+\(/)
  const currentName = nameMatch ? nameMatch[1] : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative max-w-md w-full mx-4 bg-zinc-900 border border-amber-500/20 rounded-2xl p-8 pt-24 shadow-2xl shadow-amber-900/20">
        {/* Paint kitsune mascot ~ purple-paintbrush variant. The negative top
            offset lets her float above the modal card; subtle bob animation
            keeps her feeling alive while the build runs. */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 pointer-events-none">
          <img
            src="/kitsune-paint-wait-hero.png"
            alt="Paint kitsune mascot"
            width={180}
            height={180}
            className="w-44 h-44 object-contain drop-shadow-[0_8px_24px_rgba(168,85,247,0.35)] animate-[float_3.2s_ease-in-out_infinite]"
            style={{ imageRendering: 'auto' }}
          />
        </div>
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0) rotate(-1deg); }
            50%      { transform: translateY(-6px) rotate(1deg); }
          }
        `}</style>

        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold text-amber-400">
            Building your modpack...
          </h2>

          <p
            key={msgIdx}
            className="text-sm text-zinc-400 leading-relaxed min-h-[3rem] animate-in fade-in duration-500"
          >
            {flavorMessage}
          </p>

          {currentName && (
            <div className="text-base text-zinc-200 font-mono">
              <span className="text-amber-500">›</span> {currentName}
            </div>
          )}

          {total > 0 && (
            <>
              <div className="flex items-baseline justify-center gap-2 pt-2">
                <span className="text-4xl font-bold text-amber-400 tabular-nums">{current}</span>
                <span className="text-2xl text-zinc-600">/</span>
                <span className="text-2xl text-zinc-500 tabular-nums">{total}</span>
              </div>

              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-500 transition-all duration-500 ease-out"
                  style={{ width: `${percent}%` }}
                />
              </div>

              <p className="text-xs text-zinc-600 tabular-nums">
                {percent}% complete
              </p>
            </>
          )}

          {!total && (
            <p className="text-sm text-zinc-500 italic">{progress || 'Starting...'}</p>
          )}
        </div>
      </div>
    </div>
  )
}
