import JSZip from 'jszip'
import type { PaintEntry, PackConfig } from '../types'

function sanitizeId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
}

function generatePaintingXml(config: PackConfig): string {
  const packId = sanitizeId(config.packName)

  const entries = config.paints.map((paint) => {
    const paintId = `${packId}_${sanitizeId(paint.name)}`
    const texName = `txName_${paintId}`
    const filename = `${sanitizeId(paint.name)}_diffuse.png`
    const group = `txGroup${paint.group.charAt(0).toUpperCase() + paint.group.slice(1)}`

    return `  <opaque id="${paintId}" name="${texName}" x="0" y="0" w="1" h="1" blockw="1" blockh="1">
    <property name="Diffuse" value="#@modfolder:Resources/Atlas.unity3d?assets/${filename}"/>
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

function generateLocalization(config: PackConfig): string {
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
4. Run scripts/build_bundle.py on the Resources/ folder to generate Atlas.unity3d
5. Launch the game

## Requirements
- pip install UnityPy Pillow
- python scripts/build_bundle.py "<path_to_modlet>/Resources"
`
}

export async function buildModletZip(config: PackConfig): Promise<Blob> {
  const zip = new JSZip()
  const packId = sanitizeId(config.packName)
  const root = zip.folder(packId)!
  const resources = root.folder('Resources')!
  const configFolder = root.folder('Config')!

  root.file('ModInfo.xml', generateModInfoXml(config))
  root.file('README.md', generateReadme(config))
  configFolder.file('painting.xml', generatePaintingXml(config))
  configFolder.file('Localization.txt', generateLocalization(config))

  for (const paint of config.paints) {
    const filename = `${sanitizeId(paint.name)}_diffuse.png`
    const arrayBuffer = await paint.textures.diffuse.arrayBuffer()
    resources.file(filename, arrayBuffer)
  }

  return zip.generateAsync({ type: 'blob' })
}
