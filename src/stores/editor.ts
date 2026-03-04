import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Tool } from '../types'

export const useEditorStore = defineStore('editor', () => {
  const activeTool = ref<Tool>('select')
  const selectedId = ref<string | null>(null)
  const selectedType = ref<'wall' | 'door' | 'window' | 'room' | 'furniture' | 'scaleLine' | null>(null)
  const zoom = ref(1)
  const panOffset = ref({ x: 0, y: 0 })
  const isOcrRunning = ref(false)
  const showPlanImage = ref(true)
  const show3DPreview = ref(false)

  // Temp points for wall drawing / scale line
  const pendingPoints = ref<number[]>([])

  // Room ID currently picking walls for
  const pickingRoomId = ref<string | null>(null)

  function setTool(tool: Tool) {
    activeTool.value = tool
    selectedId.value = null
    selectedType.value = null
    pendingPoints.value = []
    if (tool !== 'pickWallForRoom') {
      pickingRoomId.value = null
    }
  }

  function select(id: string, type: 'wall' | 'door' | 'window' | 'room' | 'furniture' | 'scaleLine') {
    activeTool.value = 'select'
    selectedId.value = id
    selectedType.value = type
  }

  function clearSelection() {
    selectedId.value = null
    selectedType.value = null
  }

  return {
    activeTool,
    selectedId,
    selectedType,
    zoom,
    panOffset,
    isOcrRunning,
    showPlanImage,
    show3DPreview,
    pendingPoints,
    pickingRoomId,
    setTool,
    select,
    clearSelection,
  }
})
