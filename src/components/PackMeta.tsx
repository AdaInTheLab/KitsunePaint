interface PackMetaProps {
  packName: string
  packAuthor: string
  onChange: (field: 'packName' | 'packAuthor', value: string) => void
}

export function PackMeta({ packName, packAuthor, onChange }: PackMetaProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
        Pack Info
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400">Pack Name</label>
          <input
            type="text"
            value={packName}
            onChange={(e) => onChange('packName', e.target.value)}
            placeholder="My Paint Pack"
            className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400">Author</label>
          <input
            type="text"
            value={packAuthor}
            onChange={(e) => onChange('packAuthor', e.target.value)}
            placeholder="your name"
            className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>
      </div>
    </div>
  )
}
