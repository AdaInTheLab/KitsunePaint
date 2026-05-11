/**
 * Changelog page. New entries go at the top. Keep human-readable: focus on
 * what changed for users (fixed/added/improved), not commit titles.
 *
 * Add a new release by prepending an entry to RELEASES.
 */

type Change = { type: 'fixed' | 'added' | 'improved' | 'changed'; text: string }
type Release = { version: string; date: string; changes: Change[] }

const RELEASES: Release[] = [
  {
    version: '1.6.0',
    date: 'May 2026',
    changes: [
      { type: 'added', text: 'Crop tool for non-square uploads! Drop in any image and a friendly cropper pops up so you can pick the 1:1 region you want, instead of getting an error.' },
      { type: 'improved', text: 'Server error messages are now parsed for the human-readable part. No more raw Python tracebacks if a build fails.' },
    ],
  },
  {
    version: '1.5.5',
    date: 'May 2026',
    changes: [
      { type: 'fixed', text: 'Server-side bundle builder was silently timing out on the new VPS, producing broken modpacks with raw PNGs instead of .unity3d bundles. Big thanks to the Nexus user who reported it!' },
      { type: 'improved', text: 'Large textures (over 2048px per side) now get downscaled client-side before upload. 7DTD paints map to a single block face, so anything larger was wasted bytes and slow build time.' },
      { type: 'improved', text: 'If a bundle build does fail, you now get a clear "please retry" message instead of silently downloading a broken pack.' },
    ],
  },
  {
    version: '1.5.4',
    date: 'May 2026',
    changes: [
      { type: 'fixed', text: 'EXIF-rotated JPGs (typically from phone cameras) were getting cut off on one side. Now respected during processing.' },
      { type: 'fixed', text: 'Non-square source images now fail clearly up front instead of producing weird modpacks.' },
      { type: 'improved', text: 'Landing page images optimized — 11MB → 592KB, much faster first paint.' },
    ],
  },
  {
    version: '1.5.3',
    date: 'May 2026',
    changes: [
      { type: 'added', text: 'Bundle Builder DIY kit — downloadable Python kit for advanced users who hit the rate limit or want to build packs offline.' },
      { type: 'added', text: 'Rate limiting on the bundle build API to keep the server responsive.' },
    ],
  },
  {
    version: '1.5.2',
    date: 'May 2026',
    changes: [
      { type: 'fixed', text: 'Bundle asset paths are now namespaced by pack ID so two packs with a paint of the same name (e.g. "wood") no longer collide on load.' },
    ],
  },
  {
    version: '1.5.1',
    date: 'April 2026',
    changes: [
      { type: 'changed', text: 'Block span now defaults to 1×1 instead of auto-detecting from image dimensions.' },
      { type: 'added', text: '"Report a bug" and "Support on Ko-fi" links in the footer.' },
      { type: 'added', text: 'Anonymous build counter ("X modpacks created since April 2026") in the footer.' },
      { type: 'added', text: 'Terms of Use & Privacy page covering data handling and acceptable use.' },
    ],
  },
  {
    version: '1.5.0',
    date: 'April 2026',
    changes: [
      { type: 'added', text: 'Multi-block paints — slice a single source texture across a 2×2, 3×3, or larger grid of blocks.' },
      { type: 'added', text: 'Building modal with the paint kitsune mascot and rotating flavor messages.' },
      { type: 'added', text: 'PaintUnlocked support — modpacks with up to 1023 paints (vanilla cap is 255).' },
    ],
  },
]

const TYPE_STYLES: Record<Change['type'], string> = {
  fixed: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40',
  added: 'bg-amber-950/40 text-amber-400 border-amber-800/40',
  improved: 'bg-sky-950/40 text-sky-400 border-sky-800/40',
  changed: 'bg-violet-950/40 text-violet-400 border-violet-800/40',
}

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <a href="/" className="text-xs text-zinc-600 hover:text-amber-500 transition-colors mb-8 inline-block">
          &larr; Back to KitsunePaint
        </a>

        <h1 className="text-2xl font-bold text-zinc-100 mb-2">Changelog</h1>
        <p className="text-sm text-zinc-500 mb-12">
          Recent updates to KitsunePaint. Newest at the top.
        </p>

        <div className="space-y-12">
          {RELEASES.map((release) => (
            <section key={release.version}>
              <div className="flex items-baseline gap-3 mb-4 pb-2 border-b border-zinc-800/60">
                <h2 className="text-xl font-bold text-amber-400">v{release.version}</h2>
                <span className="text-xs text-zinc-600">{release.date}</span>
              </div>

              <ul className="space-y-3">
                {release.changes.map((change, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed">
                    <span className={`shrink-0 inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded border ${TYPE_STYLES[change.type]}`}>
                      {change.type}
                    </span>
                    <span className="text-zinc-300">{change.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p className="text-xs text-zinc-700 mt-16 pt-4 border-t border-zinc-800/40">
          Full commit history on{' '}
          <a href="https://github.com/Kitsune-Den/KitsunePaint/commits/main" target="_blank" rel="noopener noreferrer"
            className="text-amber-500/80 hover:text-amber-400 transition-colors">
            GitHub
          </a>.
        </p>
      </div>
    </div>
  )
}
