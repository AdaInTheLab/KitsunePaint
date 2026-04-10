interface WallPreviewProps {
  previewUrl: string | null
  tilingX: number
  tilingY: number
  gridWidth: number
  gridHeight: number
}

export function WallPreview({ previewUrl, tilingX, tilingY, gridWidth, gridHeight }: WallPreviewProps) {
  const showGrid = gridWidth > 1 || gridHeight > 1

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Wall Preview
        </span>
        {previewUrl && (
          <span className="text-xs text-zinc-500">
            {tilingX}×{tilingY} tile{showGrid ? ` · ${gridWidth}×${gridHeight} block span` : ''}
          </span>
        )}
      </div>

      <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-zinc-700/60 bg-zinc-900">
        {previewUrl ? (
          <>
            {/* Tiled texture wall */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${previewUrl})`,
                backgroundRepeat: 'repeat',
                backgroundSize: `${100 / tilingX}% ${100 / tilingY}%`,
                imageRendering: 'pixelated',
              }}
            />

            {/* Grid overlay showing slice boundaries */}
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Vertical lines */}
                {Array.from({ length: gridWidth - 1 }, (_, i) => (
                  <div
                    key={`v${i}`}
                    className="absolute top-0 bottom-0 border-l-2 border-dashed border-amber-400/60"
                    style={{ left: `${((i + 1) / gridWidth) * (100 / tilingX)}%` }}
                  />
                ))}
                {/* Horizontal lines */}
                {Array.from({ length: gridHeight - 1 }, (_, i) => (
                  <div
                    key={`h${i}`}
                    className="absolute left-0 right-0 border-t-2 border-dashed border-amber-400/60"
                    style={{ top: `${((i + 1) / gridHeight) * (100 / tilingY)}%` }}
                  />
                ))}
                {/* Outer border around first tile group */}
                <div
                  className="absolute top-0 left-0 border-2 border-amber-400/80"
                  style={{
                    width: `${100 / tilingX}%`,
                    height: `${100 / tilingY}%`,
                  }}
                />
              </div>
            )}

            {/* Depth vignette */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40" />
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="text-4xl opacity-20">🧱</div>
            <p className="text-zinc-600 text-xs">Upload a texture to preview</p>
          </div>
        )}
      </div>
    </div>
  )
}
