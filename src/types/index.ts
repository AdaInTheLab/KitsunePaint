export interface TextureLayer {
  diffuse: File
  normal?: File
  specular?: File
}

export interface PaintEntry {
  id: string
  name: string
  group: PaintGroup
  tilingX: number
  tilingY: number
  textures: TextureLayer
  previewUrl?: string
}

export type PaintGroup =
  | 'wood'
  | 'stone'
  | 'wallpaper'
  | 'tile'
  | 'plaster'
  | 'metal'
  | 'carpet'
  | 'custom'

export interface PackConfig {
  packName: string
  packAuthor: string
  packVersion: string
  paints: PaintEntry[]
}
