import JSZip from 'jszip'
import type { PackConfig } from '../types'

export function sanitizeId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
}

/** Expand paints into individual tile entries (multi-block paints become multiple 1x1 paints). */
export function expandPaints(paints: PackConfig['paints']): { paintId: string; name: string; baseName: string; group: string; bundleIndex: number }[] {
  const entries: { paintId: string; name: string; baseName: string; group: string; bundleIndex: number }[] = []
  let bundleIndex = 0
  for (const paint of paints) {
    const baseName = sanitizeId(paint.name)
    const gw = paint.gridWidth ?? 1
    const gh = paint.gridHeight ?? 1
    if (gw === 1 && gh === 1) {
      entries.push({ paintId: baseName, name: paint.name, baseName, group: paint.group, bundleIndex })
      bundleIndex++
    } else {
      for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
          const tileName = `${baseName}_${x}_${y}`
          const tileNum = String(y * gw + x + 1).padStart(2, '0')
          const displayName = `${paint.name} ${tileNum}`
          entries.push({ paintId: tileName, name: displayName, baseName: tileName, group: paint.group, bundleIndex })
          bundleIndex++
        }
      }
    }
  }
  return entries
}

export function generatePaintingXml(config: PackConfig): string {
  const packId = sanitizeId(config.packName)
  const tiles = expandPaints(config.paints)

  const entries = tiles.map((tile) => {
    const id = `${packId}_${tile.paintId}`
    const texName = `txName_${id}`
    const group = `txGroup${tile.group.charAt(0).toUpperCase() + tile.group.slice(1)}`
    const bundleName = `Atlas_${String(tile.bundleIndex + 1).padStart(3, '0')}.unity3d`

    return `  <opaque id="${id}" name="${texName}" x="0" y="0" w="1" h="1" blockw="1" blockh="1">
    <property name="Diffuse" value="#@modfolder:Resources/${bundleName}?assets/${tile.baseName}_diffuse.png"/>
    <property name="Normal" value="#@modfolder:Resources/${bundleName}?assets/${tile.baseName}_normal.png"/>
    <property name="Specular" value="#@modfolder:Resources/${bundleName}?assets/${tile.baseName}_specular.png"/>
    <property name="PaintCost" value="1"/>
    <property name="Hidden" value="false"/>
    <property name="Group" value="${group}"/>
    <property name="SortIndex" value="255"/>
  </opaque>`
  }).join('\n')

  return `<configs><append xpath="/paints">
${entries}
</append></configs>`
}

export function generateLocalization(config: PackConfig): string {
  const packId = sanitizeId(config.packName)
  const tiles = expandPaints(config.paints)
  const header = 'Key,File,Type,UsedInMainMenu,NoTranslate,english'
  const rows = tiles.map((tile) => {
    const id = `${packId}_${tile.paintId}`
    const texName = `txName_${id}`
    const group = `txGroup${tile.group.charAt(0).toUpperCase() + tile.group.slice(1)}`
    return `${texName},painting,${group},,,${tile.name}`
  })
  return [header, ...rows].join('\n')
}

export function generateModInfoXml(config: PackConfig): string {
  const packId = sanitizeId(config.packName)
  return `<?xml version="1.0" encoding="UTF-8"?>
<xml>
  <Name value="${packId}"/>
  <DisplayName value="${config.packName}"/>
  <Version value="${config.packVersion}"/>
  <Author value="${config.packAuthor}"/>
  <Description value="Custom paint pack created with KitsunePaint. Requires OCBCustomTextures."/>
  <Website value=""/>
</xml>`
}

function generateReadme(config: PackConfig): string {
  const paintList = config.paints.map((p, i) => {
    const maps = ['diffuse', p.textures.normal ? 'normal ✓' : null, p.textures.specular ? 'specular ✓' : null]
      .filter(Boolean).join(', ')
    return `  ${String(i + 1).padStart(3, ' ')}. ${p.name} (${p.group}) [${maps}]`
  }).join('\n')

  return `# ${config.packName}
Author: ${config.packAuthor}
Created with KitsunePaint 🦊

## Paints included (${config.paints.length})
${paintList}

## Installation
1. Install OCBCustomTextures: https://www.nexusmods.com/7daystodie/mods/2788
2. Disable EAC on server and client
3. Drop this folder into your 7 Days to Die Mods/ directory
4. Restart server and client

## Notes
- One Atlas_XXX.unity3d bundle is generated per paint
- Normal and specular maps use defaults if not provided
- Vanilla supports up to 255 paints. With PaintUnlocked, supports up to 1023
`
}

async function sliceImage(file: File, gridW: number, gridH: number): Promise<File[]> {
  const bitmap = await createImageBitmap(file)
  const tileW = Math.floor(bitmap.width / gridW)
  const tileH = Math.floor(bitmap.height / gridH)
  const tiles: File[] = []
  const canvas = document.createElement('canvas')
  canvas.width = tileW
  canvas.height = tileH
  const ctx = canvas.getContext('2d')!

  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      ctx.clearRect(0, 0, tileW, tileH)
      ctx.drawImage(bitmap, x * tileW, y * tileH, tileW, tileH, 0, 0, tileW, tileH)
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'))
      const stem = file.name.replace(/\.[^/.]+$/, '').replace(/[_\-.]*(diffuse|normal|specular)$/i, '')
      tiles.push(new File([blob], `${stem}_${x}_${y}.png`, { type: 'image/png' }))
    }
  }
  bitmap.close()
  return tiles
}

async function buildBundle(name: string, diffuse: File, normal?: File, specular?: File): Promise<ArrayBuffer> {
  const formData = new FormData()
  formData.append('name', name)
  formData.append('diffuse', diffuse, `${name}_diffuse.png`)
  if (normal) {
    formData.append('normal', normal, `${name}_normal.png`)
  }
  if (specular) {
    formData.append('specular', specular, `${name}_specular.png`)
  }

  const res = await fetch('/api/build-bundle', { method: 'POST', body: formData })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(`Bundle build failed for ${name}: ${err.error}`)
  }
  return res.arrayBuffer()
}

export async function buildModletZip(
  config: PackConfig,
  onProgress?: (current: number, total: number, name: string) => void,
): Promise<Blob> {
  const zip = new JSZip()
  const packId = sanitizeId(config.packName)
  const root = zip.folder(packId)!
  const resources = root.folder('Resources')!
  const configFolder = root.folder('Config')!

  root.file('ModInfo.xml', generateModInfoXml(config))
  root.file('README.md', generateReadme(config))
  configFolder.file('painting.xml', generatePaintingXml(config))
  configFolder.file('Localization.txt', generateLocalization(config))

  // Build .unity3d bundles via the server API
  let bundleIndex = 0
  for (let i = 0; i < config.paints.length; i++) {
    const paint = config.paints[i]
    const baseName = sanitizeId(paint.name)
    const gw = paint.gridWidth ?? 1
    const gh = paint.gridHeight ?? 1
    const tileCount = gw * gh
    onProgress?.(i + 1, config.paints.length, paint.name)

    try {
      if (tileCount === 1) {
        const bundleName = `Atlas_${String(bundleIndex + 1).padStart(3, '0')}.unity3d`
        const bundleData = await buildBundle(baseName, paint.textures.diffuse, paint.textures.normal, paint.textures.specular)
        resources.file(bundleName, bundleData)
        bundleIndex++
      } else {
        // Slice each channel into tiles
        const diffuseTiles = await sliceImage(paint.textures.diffuse, gw, gh)
        const normalTiles = paint.textures.normal ? await sliceImage(paint.textures.normal, gw, gh) : []
        const specularTiles = paint.textures.specular ? await sliceImage(paint.textures.specular, gw, gh) : []

        for (let ti = 0; ti < tileCount; ti++) {
          const x = ti % gw
          const y = Math.floor(ti / gw)
          const tileName = `${baseName}_${x}_${y}`
          const bundleName = `Atlas_${String(bundleIndex + 1).padStart(3, '0')}.unity3d`
          const bundleData = await buildBundle(tileName, diffuseTiles[ti], normalTiles[ti], specularTiles[ti])
          resources.file(bundleName, bundleData)
          bundleIndex++
        }
      }
    } catch (err) {
      console.error(`Failed to build bundle for ${paint.name}:`, err)
      resources.file(`${baseName}_diffuse.png`, await paint.textures.diffuse.arrayBuffer())
      if (paint.textures.normal) {
        resources.file(`${baseName}_normal.png`, await paint.textures.normal.arrayBuffer())
      }
      if (paint.textures.specular) {
        resources.file(`${baseName}_specular.png`, await paint.textures.specular.arrayBuffer())
      }
      bundleIndex += tileCount
    }
  }

  return zip.generateAsync({ type: 'blob' })
}
