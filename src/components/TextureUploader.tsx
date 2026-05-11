import { useRef, useState, useCallback } from 'react'
import { CropDialog } from './CropDialog'

/**
 * Probes a file to find its pixel dimensions. Used to detect non-square
 * sources so we can pop the crop dialog instead of letting the bundle
 * build fail server-side with a Python ValueError. Tolerates 1px rounding
 * (e.g. 1023x1024) by treating "within 1px" as square.
 */
async function getImageDims(file: File): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(file)
  try {
    const bitmap = await createImageBitmap(file)
    const dims = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return dims
  } finally {
    URL.revokeObjectURL(url)
  }
}

function isSquare(width: number, height: number): boolean {
  return Math.abs(width - height) <= 1
}

type UploadMode = 'simple' | 'pbr'

interface TextureSlot {
  label: string
  key: 'diffuse' | 'normal' | 'specular'
  hint: string
  required: boolean
  accept?: string[]
}

const PBR_SLOTS: TextureSlot[] = [
  { label: 'Diffuse / Basecolor', key: 'diffuse', hint: 'The main color texture', required: true },
  { label: 'Normal Map', key: 'normal', hint: 'Surface detail lighting', required: false },
  { label: 'Specular / AO / Roughness', key: 'specular', hint: 'PBR material properties', required: false },
]

interface TextureFiles {
  diffuse?: File
  normal?: File
  specular?: File
}

interface TextureUploaderProps {
  onTextureSelect: (file: File, previewUrl: string) => void
  onPBRSelect?: (files: TextureFiles, previewUrl: string) => void
}

function DropZone({
  label,
  hint,
  required,
  file,
  onFile,
}: {
  label: string
  hint: string
  required: boolean
  file?: File
  onFile: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = (f: File) => {
    if (!f.type.startsWith('image/')) return
    onFile(f)
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      className={`
        relative flex flex-col items-center justify-center gap-1.5
        w-full h-24 rounded-lg cursor-pointer
        border-2 border-dashed transition-all duration-200
        ${file
          ? 'border-amber-400/60 bg-amber-400/5'
          : isDragging
            ? 'border-amber-400 bg-amber-400/10 scale-[1.01]'
            : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500 hover:bg-zinc-800/80'
        }
      `}
    >
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />

      {file ? (
        <>
          <span className="text-amber-400 text-lg">✓</span>
          <p className="text-xs text-amber-300 font-medium truncate max-w-[90%]">{file.name}</p>
        </>
      ) : (
        <>
          <p className="text-zinc-300 text-xs font-medium">
            {label}
            {required && <span className="text-amber-400 ml-1">*</span>}
          </p>
          <p className="text-zinc-600 text-[10px]">{hint}</p>
        </>
      )}
    </div>
  )
}

/**
 * Pending crop state: the user dropped a non-square file and we're waiting
 * for them to confirm a 1:1 crop region. `onResolve` is called with the
 * cropped File (or null on cancel) so the original handler can continue.
 */
type CropPending = {
  imageUrl: string
  fileName: string
  onResolve: (file: File | null) => void
}

export function TextureUploader({ onTextureSelect, onPBRSelect }: TextureUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [mode, setMode] = useState<UploadMode>('simple')
  const [pbrFiles, setPbrFiles] = useState<TextureFiles>({})
  const [cropPending, setCropPending] = useState<CropPending | null>(null)

  /**
   * If file is non-square, pops the crop dialog and resolves with the cropped
   * File once user confirms. If already square, resolves immediately with the
   * original file. Null = user cancelled.
   */
  const ensureSquare = useCallback(async (file: File): Promise<File | null> => {
    const { width, height } = await getImageDims(file)
    if (isSquare(width, height)) return file

    const imageUrl = URL.createObjectURL(file)
    return new Promise<File | null>((resolve) => {
      setCropPending({
        imageUrl,
        fileName: file.name,
        onResolve: (cropped) => {
          URL.revokeObjectURL(imageUrl)
          setCropPending(null)
          resolve(cropped)
        },
      })
    })
  }, [])

  // Simple mode handler
  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return
    const squared = await ensureSquare(file)
    if (!squared) return
    const url = URL.createObjectURL(squared)
    onTextureSelect(squared, url)
  }, [onTextureSelect, ensureSquare])

  // PBR slot handler
  const handlePBRFile = useCallback(async (key: keyof TextureFiles, file: File) => {
    const squared = await ensureSquare(file)
    if (!squared) return
    setPbrFiles(prev => {
      const next = { ...prev, [key]: squared }
      // If diffuse is set, fire the callback with preview
      if (next.diffuse) {
        const url = URL.createObjectURL(next.diffuse)
        onPBRSelect?.(next, url)
      }
      return next
    })
  }, [onPBRSelect, ensureSquare])

  return (
    <div className="flex flex-col gap-3">
      {cropPending && (
        <CropDialog
          imageUrl={cropPending.imageUrl}
          fileName={cropPending.fileName}
          onDone={(file) => cropPending.onResolve(file)}
          onCancel={() => cropPending.onResolve(null)}
        />
      )}

      {/* Mode toggle */}
      <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-1 w-fit">
        <button
          onClick={() => setMode('simple')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            mode === 'simple'
              ? 'bg-amber-500 text-zinc-950'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Simple
        </button>
        <button
          onClick={() => setMode('pbr')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            mode === 'pbr'
              ? 'bg-amber-500 text-zinc-950'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          PBR
        </button>
      </div>

      {mode === 'simple' ? (
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          className={`
            relative flex flex-col items-center justify-center gap-3
            w-full h-48 rounded-lg cursor-pointer
            border-2 border-dashed transition-all duration-200
            ${isDragging
              ? 'border-amber-400 bg-amber-400/10 scale-[1.01]'
              : 'border-zinc-600 bg-zinc-900 hover:border-amber-500/60 hover:bg-zinc-800/80'
            }
          `}
        >
          <input ref={inputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          <div className="text-3xl">🦊</div>
          <div className="text-center">
            <p className="text-zinc-300 text-sm font-medium">
              {isDragging ? 'Drop it!' : 'Drop a texture or click to browse'}
            </p>
            <p className="text-zinc-500 text-xs mt-1">PNG, JPG — ideally 512×512</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-zinc-500">Upload individual PBR map channels</p>
          {PBR_SLOTS.map(slot => (
            <DropZone
              key={slot.key}
              label={slot.label}
              hint={slot.hint}
              required={slot.required}
              file={pbrFiles[slot.key]}
              onFile={(f) => handlePBRFile(slot.key, f)}
            />
          ))}
          {pbrFiles.diffuse && (
            <p className="text-[10px] text-amber-400/70 mt-1">
              ✓ Diffuse uploaded — normal & specular optional, defaults used if missing
            </p>
          )}
        </div>
      )}
    </div>
  )
}
