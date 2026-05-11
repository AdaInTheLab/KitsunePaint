import { useState, useCallback } from 'react'
import Cropper, { type Area } from 'react-easy-crop'

/**
 * Modal cropper used when a user uploads a non-square texture. 7DTD paints
 * map to a 1:1 block face, so square sources are required ~ but rejecting
 * the upload is rude when we can just let them pick what part of their
 * image to keep. Pattern mirrored from KitsunePrints' CropDialog.
 */
interface Props {
  /** Original image URL (object-URL from File works fine). */
  imageUrl: string
  /** Original file name ~ kept on the cropped output so naming stays sane. */
  fileName: string
  /** Called with the cropped File when user confirms. */
  onDone: (croppedFile: File) => void
  /** Called when user cancels (no file is selected). */
  onCancel: () => void
}

export function CropDialog({ imageUrl, fileName, onDone, onCancel }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  async function handleDone() {
    if (!croppedAreaPixels) return
    setBusy(true)
    try {
      const blob = await getCroppedBlob(imageUrl, croppedAreaPixels)
      // Preserve original name so downstream naming stays consistent
      const file = new File([blob], fileName, { type: 'image/png' })
      onDone(file)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl w-full max-w-3xl flex flex-col max-h-[90vh] shadow-2xl shadow-amber-900/20">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-baseline justify-between">
          <h3 className="text-base font-semibold text-amber-400">Crop to square</h3>
          <span className="text-xs text-zinc-500">
            7DTD paints need a 1:1 texture ~ pick the part you want
          </span>
        </div>

        <div className="relative w-full bg-zinc-950" style={{ height: '60vh' }}>
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            objectFit="contain"
          />
        </div>

        <div className="px-6 py-4 border-t border-zinc-800 flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-zinc-400 flex-1">
            zoom
            <input
              type="range"
              min={1}
              max={4}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-amber-500"
            />
            <span className="font-mono w-10 text-right text-zinc-500">{zoom.toFixed(2)}x</span>
          </label>

          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDone}
            disabled={busy || !croppedAreaPixels}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 rounded-lg text-sm font-semibold transition-colors"
          >
            {busy ? 'Cropping...' : 'Use crop'}
          </button>
        </div>
      </div>
    </div>
  )
}

async function getCroppedBlob(imageUrl: string, area: Area): Promise<Blob> {
  const img = await loadImage(imageUrl)
  const canvas = document.createElement('canvas')
  canvas.width = area.width
  canvas.height = area.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2d context unavailable')

  ctx.drawImage(
    img,
    area.x, area.y, area.width, area.height,
    0, 0, area.width, area.height,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob returned null'))),
      'image/png',
    )
  })
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = url
  })
}
