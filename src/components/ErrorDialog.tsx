import type { FriendlyError } from '../utils/friendlyError'

/**
 * Modal shown when the build pipeline throws. Replaces the previous
 * inline "Error: ..." text in the download button, which the user
 * couldn't even see because the BuildingModal would close at the
 * same moment the error text appeared.
 *
 * Pairs with the friendlyError utility ~ this component just renders
 * whatever FriendlyError it's handed.
 */
interface Props {
  error: FriendlyError
  onClose: () => void
}

export function ErrorDialog({ error, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative max-w-md w-full mx-4 bg-zinc-900 border border-amber-500/20 rounded-2xl p-8 pt-24 shadow-2xl shadow-amber-900/20">
        {/* Same paint kitsune mascot as BuildingModal but the floating
            animation is tuned slower / more downcast ~ feels apologetic
            rather than busy. */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 pointer-events-none">
          <img
            src="/kitsune-paint-wait-hero.webp"
            alt="Paint kitsune mascot"
            width={180}
            height={180}
            className="w-44 h-44 object-contain drop-shadow-[0_8px_24px_rgba(168,85,247,0.35)] animate-[errorfloat_4s_ease-in-out_infinite]"
            style={{ imageRendering: 'auto', opacity: 0.85 }}
          />
        </div>
        <style>{`
          @keyframes errorfloat {
            0%, 100% { transform: translateY(0) rotate(2deg); }
            50%      { transform: translateY(-3px) rotate(-2deg); }
          }
        `}</style>

        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold text-amber-400">{error.title}</h2>

          <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-line">
            {error.body}
          </p>

          <div className="pt-4">
            <button
              onClick={onClose}
              className="w-full py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-sm font-semibold transition-colors"
            >
              {error.action ?? 'OK'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
