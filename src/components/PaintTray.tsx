import type { PaintEntry } from '../types'

interface PaintTrayProps {
  paints: PaintEntry[]
  onRemove: (id: string) => void
  onSelect: (paint: PaintEntry) => void
  selectedId: string | null
}

export function PaintTray({ paints, onRemove, onSelect, selectedId }: PaintTrayProps) {
  if (paints.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Paint Pack
        </span>
        <span className="text-xs text-zinc-500">{paints.length} texture{paints.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="flex flex-wrap gap-3">
        {paints.map((paint) => (
          <div
            key={paint.id}
            onClick={() => onSelect(paint)}
            className={`
              relative group flex flex-col gap-1 cursor-pointer
              rounded-lg overflow-hidden border transition-all duration-150
              ${selectedId === paint.id
                ? 'border-amber-400 ring-1 ring-amber-400/40'
                : 'border-zinc-700 hover:border-zinc-500'
              }
            `}
          >
            {/* Thumbnail */}
            <div className="w-20 h-20 bg-zinc-900 overflow-hidden">
              {paint.previewUrl && (
                <div
                  className="w-full h-full"
                  style={{
                    backgroundImage: `url(${paint.previewUrl})`,
                    backgroundRepeat: 'repeat',
                    backgroundSize: '50% 50%',
                  }}
                />
              )}
            </div>

            {/* Name */}
            <div className="px-2 pb-2">
              <p className="text-xs text-zinc-300 truncate max-w-[80px] leading-tight">
                {paint.name || 'Unnamed'}
              </p>
              <p className="text-[10px] text-zinc-600 capitalize">{paint.group}</p>
            </div>

            {/* Remove button */}
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(paint.id) }}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-zinc-900/80 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-xs leading-none"
              title="Remove"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
