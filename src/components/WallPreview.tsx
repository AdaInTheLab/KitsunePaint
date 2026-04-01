interface WallPreviewProps {
  previewUrl: string | null
  tilingX: number
  tilingY: number
}

export function WallPreview({ previewUrl, tilingX, tilingY }: WallPreviewProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Wall Preview
        </span>
        {previewUrl && (
          <span className="text-xs text-zinc-500">{tilingX}×{tilingY} tile</span>
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
            {/* Subtle block grid overlay */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `
                  linear-gradient(to right, #000 1px, transparent 1px),
                  linear-gradient(to bottom, #000 1px, transparent 1px)
                `,
                backgroundSize: `${100 / tilingX}% ${100 / tilingY}%`,
              }}
            />
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
