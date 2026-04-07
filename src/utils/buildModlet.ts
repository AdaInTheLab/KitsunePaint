import JSZip from 'jszip'
import type { PackConfig } from '../types'

export function sanitizeId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
}

export function generatePaintingXml(config: PackConfig): string {
  const packId = sanitizeId(config.packName)

  const entries = config.paints.map((paint, index) => {
    const paintId = `${packId}_${sanitizeId(paint.name)}`
    const texName = `txName_${paintId}`
    const baseName = sanitizeId(paint.name)
    const group = `txGroup${paint.group.charAt(0).toUpperCase() + paint.group.slice(1)}`
    const bundleName = `Atlas_${String(index + 1).padStart(3, '0')}.unity3d`

    const normalVal = `#@modfolder:Resources/${bundleName}?assets/${baseName}_normal.png`
    const specularVal = `#@modfolder:Resources/${bundleName}?assets/${baseName}_specular.png`

    return `  <opaque id="${paintId}" name="${texName}" x="0" y="0" w="1" h="1" blockw="1" blockh="1">
    <property name="Diffuse" value="#@modfolder:Resources/${bundleName}?assets/${baseName}_diffuse.png"/>
    <property name="Normal" value="${normalVal}"/>
    <property name="Specular" value="${specularVal}"/>
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
  const header = 'Key,File,Type,UsedInMainMenu,NoTranslate,english'
  const rows = config.paints.map((paint) => {
    const paintId = `${packId}_${sanitizeId(paint.name)}`
    const texName = `txName_${paintId}`
    const group = `txGroup${paint.group.charAt(0).toUpperCase() + paint.group.slice(1)}`
    return `${texName},painting,${group},,,${paint.name}`
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

async function buildBundle(paint: PackConfig['paints'][0]): Promise<ArrayBuffer> {
  const baseName = sanitizeId(paint.name)
  const formData = new FormData()
  formData.append('name', baseName)
  formData.append('diffuse', paint.textures.diffuse, `${baseName}_diffuse.png`)
  if (paint.textures.normal) {
    formData.append('normal', paint.textures.normal, `${baseName}_normal.png`)
  }
  if (paint.textures.specular) {
    formData.append('specular', paint.textures.specular, `${baseName}_specular.png`)
  }

  const res = await fetch('/api/build-bundle', { method: 'POST', body: formData })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(`Bundle build failed for ${paint.name}: ${err.error}`)
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
  for (let i = 0; i < config.paints.length; i++) {
    const paint = config.paints[i]
    const bundleName = `Atlas_${String(i + 1).padStart(3, '0')}.unity3d`
    onProgress?.(i + 1, config.paints.length, paint.name)

    try {
      const bundleData = await buildBundle(paint)
      resources.file(bundleName, bundleData)
    } catch (err) {
      console.error(`Failed to build bundle for ${paint.name}:`, err)
      // Fall back to including raw PNG so user can run build_bundle.py manually
      const baseName = sanitizeId(paint.name)
      resources.file(`${baseName}_diffuse.png`, await paint.textures.diffuse.arrayBuffer())
      if (paint.textures.normal) {
        resources.file(`${baseName}_normal.png`, await paint.textures.normal.arrayBuffer())
      }
      if (paint.textures.specular) {
        resources.file(`${baseName}_specular.png`, await paint.textures.specular.arrayBuffer())
      }
    }
  }

  return zip.generateAsync({ type: 'blob' })
}
