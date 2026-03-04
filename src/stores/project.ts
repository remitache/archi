import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Wall, RoomLabel, FurnitureItem, ScaleLine, Project } from '../types'
import { saveProject, loadProject, listProjects } from '../services/storage'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function createEmptyProject(name: string): Project {
  const now = new Date().toISOString()
  return {
    id: generateId(),
    name,
    planImage: null,
    walls: [],
    rooms: [],
    furniture: [],
    scaleLine: null,
    createdAt: now,
    updatedAt: now,
  }
}

export const useProjectStore = defineStore('project', () => {
  const project = ref<Project>(createEmptyProject('Untitled Project'))
  const projectList = ref<{ id: string; name: string }[]>([])

  function refreshProjectList() {
    projectList.value = listProjects()
  }

  function newProject(name: string) {
    project.value = createEmptyProject(name)
    persist()
    refreshProjectList()
  }

  function openProject(id: string) {
    const loaded = loadProject(id)
    if (loaded) {
      // Migration: old projects have `scale` instead of `scaleLine`
      if (!('scaleLine' in loaded)) {
        ;(loaded as any).scaleLine = null
        delete (loaded as any).scale
      }
      project.value = loaded
    }
  }

  function persist() {
    project.value.updatedAt = new Date().toISOString()
    saveProject(project.value)
    refreshProjectList()
  }

  function setPlanImage(base64: string) {
    project.value.planImage = base64
    persist()
  }

  // Computed scale derived from scaleLine
  const scale = computed(() => {
    const sl = project.value.scaleLine
    if (!sl) return null
    const [x1, y1, x2, y2] = sl.points
    const pixelDist = Math.hypot(x2 - x1, y2 - y1)
    if (sl.distanceCm <= 0) return null
    return { pixelsPerCm: pixelDist / sl.distanceCm }
  })

  // Scale line CRUD
  function setScaleLine(x1: number, y1: number, x2: number, y2: number, distanceCm: number): ScaleLine {
    const sl: ScaleLine = {
      id: generateId(),
      points: [x1, y1, x2, y2],
      distanceCm,
    }
    project.value.scaleLine = sl
    persist()
    return sl
  }

  function updateScaleLine(updates: Partial<ScaleLine>) {
    const sl = project.value.scaleLine
    if (sl) {
      Object.assign(sl, updates)
      persist()
    }
  }

  function deleteScaleLine() {
    project.value.scaleLine = null
    persist()
  }

  // Walls
  function addWall(x1: number, y1: number, x2: number, y2: number, type: 'wall' | 'door' | 'window' = 'wall'): Wall {
    const colorMap = { wall: '#333333', door: '#8D6E63', window: '#64B5F6' }
    const thicknessMap = { wall: 8, door: 16, window: 16 }
    const wall: Wall = {
      id: generateId(),
      points: [x1, y1, x2, y2],
      thickness: thicknessMap[type],
      color: colorMap[type],
      type,
    }
    project.value.walls.push(wall)
    persist()
    return wall
  }

  function updateWall(id: string, updates: Partial<Wall>) {
    const wall = project.value.walls.find((w) => w.id === id)
    if (wall) {
      Object.assign(wall, updates)
      persist()
    }
  }

  function deleteWall(id: string) {
    project.value.walls = project.value.walls.filter((w) => w.id !== id)
    persist()
  }

  // Room labels
  function addRoom(text: string, x: number, y: number): RoomLabel {
    const room: RoomLabel = { id: generateId(), text, x, y }
    project.value.rooms.push(room)
    persist()
    return room
  }

  function updateRoom(id: string, updates: Partial<RoomLabel>) {
    const room = project.value.rooms.find((r) => r.id === id)
    if (room) {
      Object.assign(room, updates)
      persist()
    }
  }

  function deleteRoom(id: string) {
    project.value.rooms = project.value.rooms.filter((r) => r.id !== id)
    persist()
  }

  // Furniture
  function addFurniture(name: string, imageData: string, x: number, y: number): FurnitureItem {
    const item: FurnitureItem = {
      id: generateId(),
      name,
      imageData,
      x,
      y,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    }
    project.value.furniture.push(item)
    persist()
    return item
  }

  function addBasicFurniture(x: number, y: number, width: number, height: number, fillColor = '#90CAF9'): FurnitureItem {
    const item: FurnitureItem = {
      id: generateId(),
      name: 'Rectangle',
      imageData: '',
      x,
      y,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      zIndex: 0,
      fillColor,
      width,
      height,
    }
    project.value.furniture.push(item)
    persist()
    return item
  }

  function updateFurniture(id: string, updates: Partial<FurnitureItem>) {
    const item = project.value.furniture.find((f) => f.id === id)
    if (item) {
      Object.assign(item, updates)
      persist()
    }
  }

  function deleteFurniture(id: string) {
    project.value.furniture = project.value.furniture.filter((f) => f.id !== id)
    persist()
  }

  function importProject(data: Project) {
    project.value = data
    persist()
    refreshProjectList()
  }

  // Auto-load project list on init
  refreshProjectList()

  // Load last project if available
  if (projectList.value.length > 0) {
    const first = projectList.value[0]
    if (first) {
      const last = loadProject(first.id)
      if (last) project.value = last
    }
  }

  return {
    project,
    projectList,
    newProject,
    openProject,
    persist,
    setPlanImage,
    scale,
    setScaleLine,
    updateScaleLine,
    deleteScaleLine,
    addWall,
    updateWall,
    deleteWall,
    addRoom,
    updateRoom,
    deleteRoom,
    addFurniture,
    addBasicFurniture,
    updateFurniture,
    deleteFurniture,
    importProject,
    refreshProjectList,
  }
})
