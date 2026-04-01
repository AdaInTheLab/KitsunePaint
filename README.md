# 🦊 KitsunePaint

> A web-based custom paint pack creator for 7 Days to Die.

Upload your textures, preview how they tile on a wall, download a ready-to-install modlet. No Unity knowledge required.

## What it does

1. **Upload** — drag and drop your PNG textures (diffuse required, normal/specular optional)
2. **Preview** — see how your texture tiles on a simulated block wall before you commit
3. **Configure** — name your paint, pick a group, tweak tiling
4. **Download** — get a complete `.zip` modlet ready to drop into your `Mods/` folder

## Requirements

- [OCBCustomTextures](https://www.nexusmods.com/7daystodie/mods/2788) core mod (EAC must be off)
- 7 Days to Die V2.0+

## Tech Stack

- Vite + React + TypeScript
- Tailwind CSS

## Project Structure

```
src/
  components/     # Reusable UI components
  pages/          # Route-level page components
  hooks/          # Custom React hooks
  types/          # TypeScript type definitions
  utils/          # Helper functions
  stores/         # State management
```

## Part of the Kitsune Ecosystem

- [KitsuneDen](https://github.com/AdaInTheLab/KitsuneDen) — home server dashboard
- [KitsuneCommand](https://github.com/AdaInTheLab/KitsuneCommand) — 7D2D server mod
- **KitsunePaint** — custom paint pack creator ← you are here
