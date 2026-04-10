import { describe, it, expect } from 'vitest'
import { sanitizeId, generatePaintingXml, generateLocalization, generateModInfoXml } from './buildModlet'
import type { PackConfig } from '../types'

// Helper to create a mock File (vitest runs in Node, no real File API)
function mockFile(name: string): File {
  return new File([''], name, { type: 'image/png' })
}

function mockConfig(overrides?: Partial<PackConfig>): PackConfig {
  return {
    packName: 'My Test Pack',
    packAuthor: 'TestAuthor',
    packVersion: '1.0.0',
    paints: [
      {
        id: 'abc',
        name: 'Baked Brick',
        group: 'stone',
        tilingX: 4,
        tilingY: 4,
        gridWidth: 1,
        gridHeight: 1,
        textures: { diffuse: mockFile('baked_brick_diffuse.png') },
      },
      {
        id: 'def',
        name: 'Dark Brick',
        group: 'stone',
        tilingX: 4,
        tilingY: 4,
        gridWidth: 1,
        gridHeight: 1,
        textures: { diffuse: mockFile('dark_brick_diffuse.png'), normal: mockFile('dark_brick_normal.png') },
      },
    ],
    ...overrides,
  }
}

describe('sanitizeId', () => {
  it('lowercases and replaces spaces with underscores', () => {
    expect(sanitizeId('Baked Brick')).toBe('baked_brick')
  })

  it('strips non-alphanumeric characters', () => {
    expect(sanitizeId("Ada's Paints!")).toBe('adas_paints')
  })

  it('collapses multiple spaces to single underscore', () => {
    expect(sanitizeId('red   wall')).toBe('red_wall')
  })

  it('returns empty for empty string', () => {
    expect(sanitizeId('')).toBe('')
  })
})

describe('generatePaintingXml', () => {
  it('produces valid XML structure', () => {
    const xml = generatePaintingXml(mockConfig())
    expect(xml).toContain('<configs><append xpath="/paints">')
    expect(xml).toContain('</append></configs>')
  })

  it('generates correct paint IDs from pack name + paint name', () => {
    const xml = generatePaintingXml(mockConfig())
    expect(xml).toContain('id="my_test_pack_baked_brick"')
    expect(xml).toContain('id="my_test_pack_dark_brick"')
  })

  it('maps groups with capitalized prefix', () => {
    const xml = generatePaintingXml(mockConfig())
    expect(xml).toContain('value="txGroupStone"')
  })

  it('assigns sequential Atlas bundle names', () => {
    const xml = generatePaintingXml(mockConfig())
    expect(xml).toContain('Atlas_001.unity3d')
    expect(xml).toContain('Atlas_002.unity3d')
  })

  it('references diffuse, normal, and specular per bundle', () => {
    const xml = generatePaintingXml(mockConfig())
    expect(xml).toContain('assets/baked_brick_diffuse.png')
    expect(xml).toContain('assets/baked_brick_normal.png')
    expect(xml).toContain('assets/baked_brick_specular.png')
  })
})

describe('generateLocalization', () => {
  it('starts with CSV header', () => {
    const loc = generateLocalization(mockConfig())
    expect(loc.split('\n')[0]).toBe('Key,File,Type,UsedInMainMenu,NoTranslate,english')
  })

  it('generates one row per paint', () => {
    const loc = generateLocalization(mockConfig())
    const lines = loc.split('\n')
    expect(lines.length).toBe(3) // header + 2 paints
  })

  it('uses txName_ prefix with pack+paint ID', () => {
    const loc = generateLocalization(mockConfig())
    expect(loc).toContain('txName_my_test_pack_baked_brick')
  })

  it('includes human-readable name as english column', () => {
    const loc = generateLocalization(mockConfig())
    expect(loc).toContain(',Baked Brick')
    expect(loc).toContain(',Dark Brick')
  })
})

describe('generateModInfoXml', () => {
  it('contains pack name', () => {
    const xml = generateModInfoXml(mockConfig())
    expect(xml).toContain('value="My Test Pack"')
  })

  it('contains sanitized ID as Name', () => {
    const xml = generateModInfoXml(mockConfig())
    expect(xml).toContain('value="my_test_pack"')
  })

  it('contains version', () => {
    const xml = generateModInfoXml(mockConfig())
    expect(xml).toContain('value="1.0.0"')
  })

  it('mentions OCBCustomTextures requirement', () => {
    const xml = generateModInfoXml(mockConfig())
    expect(xml).toContain('OCBCustomTextures')
  })
})

describe('generatePaintingXml multi-block (tile slicing)', () => {
  function multiBlockConfig(): PackConfig {
    return mockConfig({
      paints: [
        {
          id: 'abc',
          name: 'Big Tile',
          group: 'tile',
          tilingX: 1,
          tilingY: 1,
          gridWidth: 2,
          gridHeight: 2,
          textures: { diffuse: mockFile('big_tile_diffuse.png') },
        },
      ],
    })
  }

  it('expands 2x2 into 4 separate 1x1 paints', () => {
    const xml = generatePaintingXml(multiBlockConfig())
    expect(xml).toContain('id="my_test_pack_big_tile_0_0"')
    expect(xml).toContain('id="my_test_pack_big_tile_1_0"')
    expect(xml).toContain('id="my_test_pack_big_tile_0_1"')
    expect(xml).toContain('id="my_test_pack_big_tile_1_1"')
  })

  it('each tile is 1x1 blockw/blockh', () => {
    const xml = generatePaintingXml(multiBlockConfig())
    const matches = xml.match(/w="1" h="1" blockw="1" blockh="1"/g)
    expect(matches?.length).toBe(4)
  })

  it('assigns sequential bundle names across tiles', () => {
    const xml = generatePaintingXml(multiBlockConfig())
    expect(xml).toContain('Atlas_001.unity3d?assets/big_tile_0_0_diffuse.png')
    expect(xml).toContain('Atlas_002.unity3d?assets/big_tile_1_0_diffuse.png')
    expect(xml).toContain('Atlas_003.unity3d?assets/big_tile_0_1_diffuse.png')
    expect(xml).toContain('Atlas_004.unity3d?assets/big_tile_1_1_diffuse.png')
  })

  it('keeps 1x1 format for single block paints', () => {
    const xml = generatePaintingXml(mockConfig())
    expect(xml).toContain('w="1" h="1" blockw="1" blockh="1"')
    expect(xml).toContain('assets/baked_brick_diffuse.png"')
    expect(xml).not.toContain('assets/baked_brick_0_0_diffuse.png')
  })

  it('generates numbered display names in localization', () => {
    const loc = generateLocalization(multiBlockConfig())
    expect(loc).toContain(',Big Tile 01')
    expect(loc).toContain(',Big Tile 02')
    expect(loc).toContain(',Big Tile 03')
    expect(loc).toContain(',Big Tile 04')
  })
})
