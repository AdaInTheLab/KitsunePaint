import { useState } from 'react'
import { TextureUploader } from './components/TextureUploader'
import { WallPreview } from './components/WallPreview'
import { PaintTray } from './components/PaintTray'
import { PackMeta } from './components/PackMeta'
import { buildModletZip } from './utils/buildModlet'
import LandingPage from './pages/LandingPage'
import type { PaintEntry, PaintGroup } from './types'

interface TextureFiles {
  diffuse?: File
  normal?: File
  specular?: File
}

function generateId() {
  return Math.random().toString(36).slice(2, 9)
}

function AppTool() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [currentFiles, setCurrentFiles] = useState<TextureFiles>({})
  const [textureName, setTextureName] = useState('')
  const [textureGroup, setTextureGroup] = useState<PaintGroup>('wood')
  const [tilingX, setTilingX] = useState(4)
  const [tilingY, setTilingY] = useState(4)
  const [paints, setPaints] = useState<PaintEntry[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [packName, setPackName] = useState('')
  const [packAuthor, setPackAuthor] = useState('')
  const [isBuilding, setIsBuilding] = useState(false)

  const handleTextureSelect = (file: File, url: string) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(url)
    setCurrentFiles({ diffuse: file })
    setTextureName(file.name.replace(/\.[^/.]+$/, '').replace(/[_\-.]/g, ' ').trim())
    setSelectedId(null)
  }

  const handlePBRSelect = (files: TextureFiles, url: string) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(url)
    setCurrentFiles(files)
    if (files.diffuse) {
      setTextureName(files.diffuse.name.replace(/\.[^/.]+$/, '').replace(/[_\-.basecolor]*/g, '').replace(/[_\-.]/g, ' ').trim())
    }
    setSelectedId(null)
  }

  const handleAddToPack = () => {
    if (!currentFiles.diffuse || !previewUrl) return
    const entry: PaintEntry = {
      id: generateId(),
      name: textureName || 'Unnamed Paint',
      group: textureGroup,
      tilingX,
      tilingY,
      textures: {
        diffuse: currentFiles.diffuse,
        normal: currentFiles.normal,
        specular: currentFiles.specular,
      },
      previewUrl,
    }
    setPaints((prev) => [...prev, entry])
    setSelectedId(entry.id)
    setPreviewUrl(null)
    setCurrentFiles({})
    setTextureName('')
    setTilingX(4)
    setTilingY(4)
  }

  const handleRemovePaint = (id: string) => {
    setPaints((prev) => {
      const removed = prev.find((p) => p.id === id)
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((p) => p.id !== id)
    })
    if (selectedId === id) setSelectedId(null)
  }

  const handleSelectPaint = (paint: PaintEntry) => {
    setSelectedId(paint.id)
    setPreviewUrl(paint.previewUrl ?? null)
    setTextureName(paint.name)
    setTextureGroup(paint.group)
    setTilingX(paint.tilingX)
    setTilingY(paint.tilingY)
  }

  const handlePackMetaChange = (field: 'packName' | 'packAuthor', value: string) => {
    if (field === 'packName') setPackName(value)
    else setPackAuthor(value)
  }

  const handleDownload = async () => {
    if (!canDownload) return
    setIsBuilding(true)
    try {
      const blob = await buildModletZip({ packName, packAuthor, packVersion: '1.0.0', paints })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${packName.toLowerCase().replace(/\s+/g, '_')}_modlet.zip`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsBuilding(false)
    }
  }

  const canAdd = !!currentFiles.diffuse && !!textureName.trim()
  const canDownload = paints.length > 0 && !!packName.trim()
  const GROUPS: PaintGroup[] = ['wood', 'stone', 'wallpaper', 'tile', 'plaster', 'metal', 'carpet', 'custom']

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <header className="border-b border-zinc-800 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🦊</span>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-zinc-100">KitsunePaint</h1>
            <p className="text-xs text-zinc-500">7 Days to Die · Custom Paint Pack Creator</p>
          </div>
        </div>
        <a href="/" className="text-xs text-zinc-600 hover:text-amber-400 transition-colors tracking-widest uppercase">← Back</a>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Texture</h2>
              <TextureUploader onTextureSelect={handleTextureSelect} onPBRSelect={handlePBRSelect} />
              {(currentFiles.normal || currentFiles.specular) && (
                <div className="flex gap-2 flex-wrap">
                  {currentFiles.normal && <span className="text-[10px] bg-zinc-800 text-amber-400 px-2 py-0.5 rounded-full">Normal ✓</span>}
                  {currentFiles.specular && <span className="text-[10px] bg-zinc-800 text-amber-400 px-2 py-0.5 rounded-full">Specular ✓</span>}
                </div>
              )}
            </section>

            <section className="flex flex-col gap-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Configure</h2>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">Paint Name</label>
                <input type="text" value={textureName} onChange={(e) => setTextureName(e.target.value)}
                  placeholder="e.g. oak floor"
                  className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 transition-colors" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">Group</label>
                <select value={textureGroup} onChange={(e) => setTextureGroup(e.target.value as PaintGroup)}
                  className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors capitalize">
                  {GROUPS.map((g) => <option key={g} value={g} className="capitalize">{g}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-zinc-400">Tiling X</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min={1} max={8} value={tilingX} onChange={(e) => setTilingX(Number(e.target.value))} className="flex-1 accent-amber-400" />
                    <span className="text-sm text-zinc-300 w-4 text-right">{tilingX}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-zinc-400">Tiling Y</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min={1} max={8} value={tilingY} onChange={(e) => setTilingY(Number(e.target.value))} className="flex-1 accent-amber-400" />
                    <span className="text-sm text-zinc-300 w-4 text-right">{tilingY}</span>
                  </div>
                </div>
              </div>
              <button onClick={handleAddToPack} disabled={!canAdd}
                className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${canAdd ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 cursor-pointer' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}>
                + Add to Pack
              </button>
            </section>
          </div>

          <div className="flex flex-col gap-6">
            <WallPreview previewUrl={previewUrl} tilingX={tilingX} tilingY={tilingY} />
          </div>
        </div>

        {paints.length > 0 && (
          <div className="border-t border-zinc-800 pt-8 flex flex-col gap-6">
            <PaintTray paints={paints} onRemove={handleRemovePaint} onSelect={handleSelectPaint} selectedId={selectedId} />
            <PackMeta packName={packName} packAuthor={packAuthor} onChange={handlePackMetaChange} />
            <button onClick={handleDownload} disabled={!canDownload || isBuilding}
              className={`w-full py-3 rounded-lg text-sm font-semibold transition-all duration-150 ${canDownload && !isBuilding ? 'bg-zinc-100 hover:bg-white text-zinc-950 cursor-pointer' : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'}`}>
              {isBuilding ? 'Building modlet...' : canDownload ? `⬇ Download "${packName}" Modlet` : 'Add a pack name to download'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

export default function App() {
  const path = window.location.pathname
  if (path === '/app') return <AppTool />
  return <LandingPage />
}
