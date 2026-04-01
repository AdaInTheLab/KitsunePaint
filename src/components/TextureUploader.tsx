import { useRef, useState, useCallback } from 'react'

interface TextureUploaderProps {
  onTextureSelect: (file: File, previewUrl: string) => void
}

export function TextureUploader({ onTextureSelect }: TextureUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    onTextureSelect(file, url)
  }, [onTextureSelect])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDrop={handleDrop}
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
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
      <div className="text-3xl">🦊</div>
      <div className="text-center">
        <p className="text-zinc-300 text-sm font-medium">
          {isDragging ? 'Drop it!' : 'Drop a texture or click to browse'}
        </p>
        <p className="text-zinc-500 text-xs mt-1">PNG, JPG — ideally 512×512</p>
      </div>
    </div>
  )
}
