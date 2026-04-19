import { useState, useEffect } from 'react'

const foxStyles = `
  @keyframes kfox-breathe { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-2px)} }
  @keyframes kfox-ear { 0%,85%,100%{transform:rotate(0deg);transform-origin:bottom center} 90%{transform:rotate(-8deg);transform-origin:bottom center} 95%{transform:rotate(4deg);transform-origin:bottom center} }
  @keyframes kfox-blink-lid { 0%,88%,96%,100%{transform:scaleY(1)} 92%{transform:scaleY(0.1)} }
  @keyframes kfox-tail { 0%,100%{transform:rotate(0deg);transform-origin:top left} 25%{transform:rotate(12deg);transform-origin:top left} 75%{transform:rotate(-8deg);transform-origin:top left} }
  @keyframes kfox-glitch { 0%,70%,100%{opacity:1;transform:translateX(0)} 72%{opacity:0.4;transform:translateX(3px)} 74%{opacity:1;transform:translateX(-2px)} 76%{opacity:0.7;transform:translateX(0)} 78%{opacity:1} }
  @keyframes kfox-cyber { 0%,69%,85%,100%{opacity:0} 72%,82%{opacity:1} }
  @keyframes kfox-loadbar { 0%,60%,100%{opacity:0;width:0px} 65%{opacity:1;width:0px} 80%{opacity:1;width:28px} 90%{opacity:1;width:28px} 95%{opacity:0;width:28px} }
  @keyframes kfox-eyeglow { 0%,87%,97%,100%{fill:#fbbf24} 88%,96%{fill:#ffffff} 90%,94%{fill:#fb923c} }
  .kfox-body{animation:kfox-breathe 2.4s ease-in-out infinite}
  .kfox-ear{animation:kfox-ear 3.5s ease-in-out infinite}
  .kfox-blink{animation:kfox-blink-lid 3.5s ease-in-out infinite}
  .kfox-tail{animation:kfox-tail 2s ease-in-out infinite}
  .kfox-glitch{animation:kfox-glitch 4s ease-in-out infinite}
  .kfox-cyber{animation:kfox-cyber 4s ease-in-out infinite}
  .kfox-loadbar{animation:kfox-loadbar 4s ease-in-out infinite;overflow:hidden}
  .kfox-pupil{animation:kfox-eyeglow 3.5s ease-in-out infinite}
  .cta-btn {
    background: linear-gradient(135deg, #fcd34d 0%, #f59e0b 50%, #b45309 100%);
    box-shadow: 0 0 0 1px rgba(251,191,36,0.25), 0 2px 20px rgba(217,119,6,0.5), inset 0 1px 0 rgba(255,255,255,0.15);
    transition: all 0.2s ease;
  }
  .cta-btn:hover {
    background: linear-gradient(135deg, #fde68a 0%, #fbbf24 50%, #d97706 100%);
    box-shadow: 0 0 0 1px rgba(251,191,36,0.5), 0 4px 40px rgba(251,146,60,0.7), inset 0 1px 0 rgba(255,255,255,0.2);
    transform: translateY(-1px);
  }
  .cta-btn:active { transform: translateY(0px); }
`

function PixelFox({ size = 64 }: { size?: number }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: foxStyles }} />
      <svg width={size} height={Math.round(size * 1.17)} viewBox="0 0 80 96" style={{ imageRendering: 'pixelated' }}>
        <g className="kfox-tail">
          <rect x="8" y="64" width="8" height="8" fill="#f97316"/>
          <rect x="4" y="56" width="8" height="12" fill="#f97316"/>
          <rect x="2" y="48" width="6" height="12" fill="#f97316"/>
          <rect x="4" y="44" width="6" height="8" fill="#f97316"/>
          <rect x="8" y="40" width="4" height="8" fill="#f97316"/>
          <rect x="4" y="60" width="6" height="8" fill="#fbbf24"/>
          <rect x="2" y="52" width="5" height="8" fill="#fbbf24"/>
        </g>
        <g className="kfox-glitch kfox-body">
          <rect x="24" y="48" width="32" height="24" rx="2" fill="#f97316"/>
          <rect x="20" y="52" width="8" height="16" rx="1" fill="#f97316"/>
          <rect x="52" y="52" width="8" height="16" rx="1" fill="#f97316"/>
          <rect x="28" y="68" width="8" height="12" fill="#f97316"/>
          <rect x="44" y="68" width="8" height="12" fill="#f97316"/>
          <rect x="24" y="60" width="12" height="10" fill="#fde68a"/>
          <rect x="44" y="60" width="12" height="10" fill="#fde68a"/>
          <rect x="24" y="72" width="10" height="4" fill="#78350f"/>
          <rect x="46" y="72" width="10" height="4" fill="#78350f"/>
        </g>
        <g className="kfox-body">
          <rect x="22" y="20" width="36" height="32" rx="4" fill="#f97316"/>
          <rect x="18" y="28" width="10" height="18" rx="2" fill="#f97316"/>
          <rect x="52" y="28" width="10" height="18" rx="2" fill="#f97316"/>
          <rect x="26" y="28" width="28" height="22" fill="#fde68a"/>
          <g className="kfox-ear">
            <rect x="22" y="8" width="12" height="16" rx="2" fill="#f97316"/>
            <rect x="25" y="10" width="6" height="10" fill="#fda4af"/>
          </g>
          <rect x="46" y="8" width="12" height="16" rx="2" fill="#f97316"/>
          <rect x="49" y="10" width="6" height="10" fill="#fda4af"/>
          <rect x="28" y="32" width="8" height="6" rx="1" fill="#1c1917"/>
          <rect x="44" y="32" width="8" height="6" rx="1" fill="#1c1917"/>
          <rect x="29" y="33" width="6" height="4" rx="1" className="kfox-pupil" fill="#fbbf24"/>
          <rect x="45" y="33" width="6" height="4" rx="1" className="kfox-pupil" fill="#fbbf24"/>
          <rect x="31" y="33" width="2" height="2" fill="#ffffff"/>
          <rect x="47" y="33" width="2" height="2" fill="#ffffff"/>
          <g className="kfox-blink">
            <rect x="28" y="32" width="8" height="3" fill="#1c1917"/>
            <rect x="44" y="32" width="8" height="3" fill="#1c1917"/>
          </g>
          <rect x="37" y="39" width="6" height="4" rx="1" fill="#fda4af"/>
          <rect x="34" y="42" width="12" height="2" fill="#78350f"/>
          <rect x="24" y="24" width="32" height="4" fill="#ea580c"/>
          <rect x="16" y="30" width="6" height="3" fill="#f97316"/>
          <rect x="58" y="30" width="6" height="3" fill="#f97316"/>
          <rect x="14" y="28" width="4" height="3" fill="#f97316"/>
          <rect x="62" y="28" width="4" height="3" fill="#f97316"/>
        </g>
        <rect className="kfox-cyber" x="18" y="34" width="44" height="1" fill="#fb923c" opacity="0"/>
        <rect className="kfox-cyber" x="18" y="38" width="44" height="1" fill="#fbbf24" opacity="0" style={{ animationDelay: '0.1s' }}/>
        <g transform="translate(26,16)">
          <rect x="0" y="0" width="28" height="5" rx="1" fill="#1c1917" stroke="#f59e0b" strokeWidth="0.5"/>
          <rect className="kfox-loadbar" x="1" y="1" height="3" rx="0.5" fill="#f59e0b" width="0"/>
        </g>
      </svg>
    </>
  )
}

export default function LandingPage() {
  const [mounted, setMounted] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    setMounted(true)
    const handleMouse = (e: MouseEvent) => {
      setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight })
    }
    window.addEventListener('mousemove', handleMouse)
    return () => window.removeEventListener('mousemove', handleMouse)
  }, [])

  const glowX = mousePos.x * 100
  const glowY = mousePos.y * 100

  return (
    <div className="relative min-h-screen bg-zinc-950 overflow-hidden font-sans">
      <div className="pointer-events-none fixed inset-0 opacity-30 transition-opacity duration-300"
        style={{ background: `radial-gradient(600px circle at ${glowX}% ${glowY}%, rgba(251,146,60,0.15), transparent 60%)` }} />
      <div className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{ backgroundImage: `linear-gradient(rgba(251,146,60,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(251,146,60,0.5) 1px, transparent 1px)`, backgroundSize: '60px 60px' }} />

      <nav className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-zinc-800/50">
        <div className="flex items-center gap-2">
          <span className="text-xl">🦊</span>
          <span className="text-sm font-semibold tracking-widest text-zinc-400 uppercase">KitsunePaint <span className="text-zinc-600 font-normal">v{__APP_VERSION__}</span></span>
        </div>
        <div className="flex items-center gap-6 text-xs text-zinc-500 tracking-wider uppercase">
          <a href="https://github.com/Kitsune-Den/KitsunePaint" target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors">GitHub</a>
          <a href="https://www.nexusmods.com/7daystodie/mods/2788" target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors">OCBCustomTextures</a>
        </div>
      </nav>

      <main className="relative z-10 flex flex-col items-center justify-center min-h-[85vh] px-6 text-center">
        <div className={`mb-6 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{ filter: 'drop-shadow(0 0 60px rgba(251,146,60,0.35))' }}>
          <img src="/kitsune-paint-hero.png" alt="KitsunePaint" className="w-64 h-64 md:w-80 md:h-80 object-contain" />
        </div>

        <div className={`transition-all duration-1000 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <span className="text-xs tracking-[0.3em] uppercase text-amber-500 font-medium">
            7 Days to Die · Custom Paint Tool
          </span>
        </div>

        <h1 className={`mt-4 text-5xl md:text-7xl font-black tracking-tight text-zinc-100 leading-none max-w-4xl transition-all duration-1000 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          Paint your base<br />
          <span className="text-amber-400">your way.</span>
        </h1>

        <p className={`mt-8 text-lg text-zinc-400 max-w-xl leading-relaxed transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          The 7D2D community wanted custom paint textures for years. Modders said it was impossible.
          We built a web tool that does it anyway - no Unity, no installs, no nonsense.
          Drop your textures. Preview the tiling. Download a working modlet.
        </p>

        <div className={`mt-10 flex flex-col sm:flex-row items-center gap-4 transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <a href="/app" className="group cta-btn px-10 py-5 text-zinc-950 text-sm font-black tracking-widest uppercase rounded-lg">
            Open the Tool
            <span className="ml-2 group-hover:translate-x-1 inline-block transition-transform">→</span>
          </a>
          <a href="https://github.com/Kitsune-Den/KitsunePaint" target="_blank" rel="noopener noreferrer"
            className="px-8 py-4 border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 text-sm font-medium tracking-widest uppercase rounded-lg transition-all duration-200">
            View Source
          </a>
        </div>

        <p className={`mt-6 text-xs text-zinc-600 transition-all duration-1000 delay-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          Requires <a href="https://www.nexusmods.com/7daystodie/mods/2788" className="text-zinc-500 hover:text-amber-500 underline underline-offset-2 transition-colors" target="_blank" rel="noopener noreferrer">OCBCustomTextures</a> · EAC must be off · V2.0+
        </p>
      </main>

      {/* Screenshots */}
      <section className={`relative z-10 py-16 px-6 transition-all duration-1000 delay-600 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <div className="max-w-5xl mx-auto flex flex-col gap-6">
          <p className="text-center text-xs tracking-[0.3em] uppercase text-zinc-500 font-medium">See it in action</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <div className="rounded-xl overflow-hidden border border-zinc-800 shadow-[0_0_40px_rgba(0,0,0,0.6)]">
                <img src="/screenshot-paint-menu.png" alt="Custom paints in the 7D2D paint menu" className="w-full object-cover" />
              </div>
              <p className="text-xs text-zinc-600 text-center">Custom paints show up directly in the game paint menu</p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="rounded-xl overflow-hidden border border-zinc-800 shadow-[0_0_40px_rgba(0,0,0,0.6)]">
                <img src="/screenshot-ingame-wall.png" alt="Custom texture rendered on a wall in 7D2D" className="w-full object-cover" />
              </div>
              <p className="text-xs text-zinc-600 text-center">Full PBR rendering with normal maps — in a zombie survival game</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={`relative z-10 border-t border-zinc-800/60 transition-all duration-1000 delay-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <div className="max-w-5xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="flex flex-col gap-3">
            <div className="text-2xl">🖼️</div>
            <h3 className="text-sm font-bold tracking-widest uppercase text-zinc-200">Upload & Preview</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">Drop your PNG or JPG. See exactly how it tiles on a block wall before you commit. Simple mode or full PBR with normal maps.</p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="text-2xl">📦</div>
            <h3 className="text-sm font-bold tracking-widest uppercase text-zinc-200">Download a Modlet</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">Name it, group it, pack as many textures as you want. One click gives you a zip with the correct XML, localization, and source files.</p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="text-2xl">⚡</div>
            <h3 className="text-sm font-bold tracking-widest uppercase text-zinc-200">Bundle Builder</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">Run the included Python script on your Resources folder. It generates the Unity asset bundles automatically. No Unity install required.</p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="text-2xl">🔪</div>
            <h3 className="text-sm font-bold tracking-widest uppercase text-zinc-200">Texture Slicing</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">Upload a large texture and split it across multiple blocks. Set the Block Span to 2x2, 3x3, or up to 4x4 — each tile becomes its own paint, ready to assemble in-game.</p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="text-2xl">🤝</div>
            <h3 className="text-sm font-bold tracking-widest uppercase text-zinc-200">Works with Other Packs</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">Tested alongside Pyro Paints and CK Textures. All OCBCustomTextures-based packs coexist as separate modlets — no conflicts. Just mind the 255 paint cap.</p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="text-2xl">🔓</div>
            <h3 className="text-sm font-bold tracking-widest uppercase text-zinc-200">Break the 255 Limit</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">Hit the paint cap? <a href="https://www.nexusmods.com/7daystodie/mods/10059" className="text-amber-500 hover:text-amber-400 transition-colors">KitsunePaintUnlocked</a> raises the limit to 1023 paints — the first mod to fully break the vanilla ceiling. Pair it with KitsunePaint for unlimited creativity.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className={`relative z-10 border-t border-zinc-800/60 transition-all duration-1000 delay-800 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <div className="max-w-3xl mx-auto px-6 py-16 flex flex-col gap-8">
          <p className="text-center text-xs tracking-[0.3em] uppercase text-zinc-500 font-medium">Frequently Asked Questions</p>
          <div className="flex flex-col gap-3">
            {[
              {
                q: 'Does this work with Pyro Paints / CK Textures / other paint mods?',
                a: 'Yes. We tested KitsunePaint alongside Pyro Paints (77 paints) and both load cleanly together. All OCBCustomTextures-based packs coexist as separate modlets with no conflicts.',
              },
              {
                q: 'How many paints can I add?',
                a: 'The game has a hard cap of 255 total paints. Vanilla uses 154, so you have 101 slots for mods. If you also run Pyro Paints (77), that leaves 24. Plan your packs accordingly.',
              },
              {
                q: 'I see red "Graphics.CopyTexture" errors in the F1 console. Is that bad?',
                a: "Those mipmap warnings come from OCBCustomTextures' built-in textures, not from KitsunePaint bundles. They're purely cosmetic — your paints work fine. Every paint mod produces them.",
              },
              {
                q: 'My texture glows in the dark. What gives?',
                a: "You likely uploaded a PBR roughness map in the specular slot. 7D2D uses a specular workflow, not PBR roughness. Either invert your roughness map in an image editor, or leave the specular slot empty and KitsunePaint will generate a neutral default.",
              },
              {
                q: 'Can I add more PBR channels like AO, height, or emissive?',
                a: "No — 7D2D only supports three texture channels: Diffuse, Normal, and Specular. That's a hard limit in the game's shader. The specular map is a packed RGBA texture, so there's some flexibility within that one map, but you can't add additional channels.",
              },
              {
                q: 'What does the Block Span / texture slicing feature do?',
                a: 'Upload a larger texture (e.g. 1024x1024) and set Block Span to 2x2. KitsunePaint slices it into 4 separate tile paints that you can arrange on adjacent blocks in-game to reconstruct the full image. Works up to 4x4 (16 tiles). The grid size is auto-suggested based on your image dimensions.',
              },
              {
                q: 'How do I update OCBCustomTextures?',
                a: "Delete your old OcbCustomTextures folder from Mods/ before installing the new version. Don't just overwrite — leftover files from previous versions can cause issues.",
              },
            ].map(({ q, a }) => (
              <details key={q} className="group border border-zinc-800 rounded-lg overflow-hidden">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-medium text-zinc-200 hover:text-amber-400 transition-colors select-none">
                  {q}
                  <span className="text-zinc-600 group-open:rotate-45 transition-transform text-lg ml-4">+</span>
                </summary>
                <div className="px-5 pb-4 text-sm text-zinc-500 leading-relaxed">{a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-zinc-800/40 px-8 py-6 flex items-center justify-between flex-wrap gap-4">
        <span className="text-xs text-zinc-600">
          Part of the <a href="https://kitsuneden.net" className="hover:text-amber-500 transition-colors">Kitsune ecosystem</a> · Built by Ada
        </span>
        <div className="flex items-center gap-2">
          <PixelFox size={32} />
          <span className="text-xs text-zinc-600 tracking-widest uppercase">
            Powered by <span className="text-amber-600/70 hover:text-amber-500 transition-colors cursor-default">the Skulk</span>
          </span>
        </div>
        <span className="text-xs text-zinc-700">
          <a href="/terms" className="hover:text-amber-500 transition-colors">Terms & Privacy</a>
          {' · '}
          paint.kitsuneden.net
        </span>
      </footer>
    </div>
  )
}
