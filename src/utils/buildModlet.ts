import JSZip from 'jszip'
import type { PaintEntry, PackConfig } from '../types'

function sanitizeId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
}

function generatePaintingXml(config: PackConfig): string {
  const packId = sanitizeId(config.packName)

  const entries = config.paints.map((paint) => {
    const paintId = `${packId}_${sanitizeId(paint.name)}`
    const filename = `${sanitizeId(paint.name)}_diffuse.png`

    return `  <opaque id="${paintId}" texture="tx_${paintId}" x="0" y="0" w="${paint.tilingX}" h="${paint.tilingY}" blockw="${paint.tilingX}" blockh="${paint.tilingY}">
    <property name="Diffuse" value="#@modfolder:Resources/Atlas.unity3d?assets/${filename}"/>
    <property name="PaintCost" value="1"/>
    <property name="Hidden" value="false"/>
    <property name="Group" value="txGroup${paint.group.charAt(0).toUpperCase() + paint.group.slice(1)}"/>
    <property name="SortIndex" value="255"/>
  </opaque>`
  }).join('\n')

  return `<configs><append xpath="/paints">
${entries}
</append></configs>`
}

function generateModInfoXml(config: PackConfig): string {
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
  const paintList = config.paints.map((p) => `  - ${p.name} (${p.group})`).join('\n')
  return `# ${config.packName}
Author: ${config.packAuthor}
Created with KitsunePaint 🦊

## Paints included (${config.paints.length})
${paintList}

## Installation
1. Install OCBCustomTextures: https://www.nexusmods.com/7daystodie/mods/2788
2. Disable EAC on server and client
3. Drop this folder into your 7 Days to Die Mods/ directory
4. Launch the game

## Notes
- Textures are included as PNG source files
- A Unity asset bundle (Atlas.unity3d) must be built from these PNGs using OCBCustomTextures workflow
- See: https://github.com/OCB7D2D/OcbCustomTextures
`
}

export async function buildModletZip(config: PackConfig): Promise<Blob> {
  const zip = new JSZip()
  const packId = sanitizeId(config.packName)
  const root = zip.folder(packId)!
  const resources = root.folder('Resources')!
  const configFolder = root.folder('Config')!

  // ModInfo.xml
  root.file('ModInfo.xml', generateModInfoXml(config))

  // README
  root.file('README.md', generateReadme(config))

  // painting.xml
  configFolder.file('painting.xml', generatePaintingXml(config))

  // Texture files
  for (const paint of config.paints) {
    const filename = `${sanitizeId(paint.name)}_diffuse.png`
    const arrayBuffer = await paint.textures.diffuse.arrayBuffer()
    resources.file(filename, arrayBuffer)
  }

  return zip.generateAsync({ type: 'blob' })
}
