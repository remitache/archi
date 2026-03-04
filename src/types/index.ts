export interface Wall {
  id: string
  points: [number, number, number, number] // x1, y1, x2, y2
  thickness: number
  color: string
  type?: 'wall' | 'door' | 'window'
  hidden?: boolean
}

export interface RoomImage {
  id: string
  data: string // base64 JPEG (resized)
}

export interface RoomLabel {
  id: string
  text: string
  x: number
  y: number
  wallIds?: string[]
  images?: RoomImage[]
}

export interface FurnitureItem {
  id: string
  name: string
  imageData: string // base64
  x: number
  y: number
  rotation: number
  scaleX: number
  scaleY: number
  zIndex?: number
  fillColor?: string
  width?: number
  height?: number
}

export interface ScaleLine {
  id: string
  points: [number, number, number, number] // x1, y1, x2, y2
  distanceCm: number
}

export interface Project {
  id: string
  name: string
  planImage: string | null // base64
  walls: Wall[]
  rooms: RoomLabel[]
  furniture: FurnitureItem[]
  scaleLine: ScaleLine | null
  createdAt: string
  updatedAt: string
}

export type Tool = 'select' | 'addWall' | 'addDoor' | 'addWindow' | 'setScale' | 'addRoom' | 'addBasicFurniture' | 'pickWallForRoom'
