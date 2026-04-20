# 🦊 KitsunePaint

<p align="center"><img src="public/kitsune-paint-hero.png" width="300" height="300" alt="KitsunePaint" /></p>

<p align="center">
  <strong>A web-based custom paint pack creator for 7 Days to Die.</strong><br/>
  <a href="https://paint.kitsuneden.net">paint.kitsuneden.net</a>
</p>

<p align="center">
  <a href="https://www.nexusmods.com/7daystodie/mods/10021"><img src="https://img.shields.io/badge/Download-Nexus_Mods-da8e35?style=flat&logo=nexusmods&logoColor=white" alt="Download on Nexus Mods" /></a>
  <a href="https://paint.kitsuneden.net"><img src="https://img.shields.io/badge/Live_Tool-paint.kitsuneden.net-14b8a6?style=flat" alt="Live Tool" /></a>
  <a href="https://7daystodie.com"><img src="https://img.shields.io/badge/7_Days_to_Die-V2.0%2B-8b0000?style=flat" alt="7 Days to Die V2.0+" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/Kitsune-Den/KitsunePaint?style=flat" alt="License" /></a>
  <a href="https://github.com/Kitsune-Den/KitsunePaint/stargazers"><img src="https://img.shields.io/github/stars/Kitsune-Den/KitsunePaint?style=flat&logo=github" alt="GitHub stars" /></a>
</p>

Upload your textures, preview how they tile on a wall, download a ready-to-install modlet. No Unity installation required.

## What it does

1. **Upload:** drag and drop PNG/JPG textures in Simple mode (diffuse only) or PBR mode (diffuse + normal + specular)
2. **Preview:** see exactly how your texture tiles on a simulated block wall before you commit
3. **Configure:** name your paint, pick a group (Masonry, Wallpaper, Tiles etc), tweak tiling
4. **Download:** get a complete `.zip` modlet with painting.xml, Localization.txt, ModInfo.xml, and all source textures
5. **Build bundles:** run the included Python script to generate `Atlas_XXX.unity3d` asset bundles, one per paint, scales to 20+ paints

## Bundle Builder

The web tool generates the modlet zip. To get textures rendering in-game you also need to run the Python bundle builder:

```bash
pip install UnityPy Pillow
python scripts/build_bundle.py "path/to/your/modlet/Resources"
```

This generates per-paint Unity asset bundles with proper mipmap data, DXTnm normals, and unique CAB names. No Unity installation needed.

## Dependencies

- [OCBCustomTextures](https://www.nexusmods.com/7daystodie/mods/2788) v0.8.0+ (must be installed on server and client)
- EAC must be disabled on both server and client
- 7 Days to Die V2.0+
- Python + `pip install UnityPy Pillow` (for bundle builder only)

## Tech Stack

- Vite + React + TypeScript
- Tailwind CSS
- JSZip (modlet packaging)
- UnityPy + Pillow (bundle builder)

## Project Structure

```
src/
  components/       # TextureUploader, WallPreview, PaintTray, PackMeta
  pages/            # LandingPage, routed via App.tsx
  types/            # TypeScript type definitions
  utils/            # buildModlet.ts — zip generation
scripts/
  build_bundle.py   # Python bundle builder
  Atlas.template.unity3d  # Template bundle for injection
public/
  .htaccess         # SPA routing for Apache
```

## Part of the Kitsune Ecosystem

- [KitsuneCommand](https://github.com/Kitsune-Den/KitsuneCommand): 7D2D server-management suite (RESTful API + web panel)
- [Kitsune7Den](https://github.com/Kitsune-Den/Kitsune7Den): Windows desktop dashboard for 7D2D dedicated servers
- [KitsunePaintUnlocked](https://github.com/Kitsune-Den/KitsunePaintUnlocked): breaks the 255 paint texture hard limit to 1023
- [KitsuneDen](https://github.com/Kitsune-Den/KitsuneDen): unified home-server dashboard (Minecraft / 7D2D / Hytale)
- **KitsunePaint**: custom paint pack creator ← you are here

---

<p align="center">
  <svg width="48" height="56" viewBox="0 0 80 96" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated">
    <rect x="8" y="64" width="8" height="8" fill="#f97316"/>
    <rect x="4" y="56" width="8" height="12" fill="#f97316"/>
    <rect x="2" y="48" width="6" height="12" fill="#f97316"/>
    <rect x="4" y="44" width="6" height="8" fill="#f97316"/>
    <rect x="8" y="40" width="4" height="8" fill="#f97316"/>
    <rect x="4" y="60" width="6" height="8" fill="#fbbf24"/>
    <rect x="2" y="52" width="5" height="8" fill="#fbbf24"/>
    <rect x="24" y="48" width="32" height="24" rx="2" fill="#f97316"/>
    <rect x="20" y="52" width="8" height="16" rx="1" fill="#f97316"/>
    <rect x="52" y="52" width="8" height="16" rx="1" fill="#f97316"/>
    <rect x="28" y="68" width="8" height="12" fill="#f97316"/>
    <rect x="44" y="68" width="8" height="12" fill="#f97316"/>
    <rect x="24" y="60" width="12" height="10" fill="#fde68a"/>
    <rect x="44" y="60" width="12" height="10" fill="#fde68a"/>
    <rect x="24" y="72" width="10" height="4" fill="#78350f"/>
    <rect x="46" y="72" width="10" height="4" fill="#78350f"/>
    <rect x="22" y="20" width="36" height="32" rx="4" fill="#f97316"/>
    <rect x="18" y="28" width="10" height="18" rx="2" fill="#f97316"/>
    <rect x="52" y="28" width="10" height="18" rx="2" fill="#f97316"/>
    <rect x="26" y="28" width="28" height="22" fill="#fde68a"/>
    <rect x="22" y="8" width="12" height="16" rx="2" fill="#f97316"/>
    <rect x="25" y="10" width="6" height="10" fill="#fda4af"/>
    <rect x="46" y="8" width="12" height="16" rx="2" fill="#f97316"/>
    <rect x="49" y="10" width="6" height="10" fill="#fda4af"/>
    <rect x="28" y="32" width="8" height="6" rx="1" fill="#1c1917"/>
    <rect x="44" y="32" width="8" height="6" rx="1" fill="#1c1917"/>
    <rect x="29" y="33" width="6" height="4" rx="1" fill="#fbbf24"/>
    <rect x="45" y="33" width="6" height="4" rx="1" fill="#fbbf24"/>
    <rect x="31" y="33" width="2" height="2" fill="#ffffff"/>
    <rect x="47" y="33" width="2" height="2" fill="#ffffff"/>
    <rect x="37" y="39" width="6" height="4" rx="1" fill="#fda4af"/>
    <rect x="34" y="42" width="12" height="2" fill="#78350f"/>
    <rect x="24" y="24" width="32" height="4" fill="#ea580c"/>
    <rect x="16" y="30" width="6" height="3" fill="#f97316"/>
    <rect x="58" y="30" width="6" height="3" fill="#f97316"/>
  </svg>
  <br/>
  <sub>Powered by the Skulk</sub>
</p>
