<template>
  <div ref="containerRef" class="canvas-container" :style="{ cursor: canvasCursor }">
    <v-stage
      ref="stageRef"
      :config="stageConfig"
      @wheel="onWheel"
      @mousedown="onStageMouseDown"
      @mousemove="onStageMouseMove"
      @mouseup="onStageMouseUp"
      @click="onStageClick"
    >
      <!-- Background layer (plan image) -->
      <v-layer>
        <v-image
          v-if="planImageObj && editor.showPlanImage"
          :config="{
            image: planImageObj,
            x: 0,
            y: 0,
          }"
        />
      </v-layer>

      <!-- Scale line preview layer -->
      <v-layer>
        <v-line
          v-if="editor.activeTool === 'setScale' && editor.pendingPoints.length >= 2"
          :config="{
            points: editor.pendingPoints,
            stroke: '#FF5722',
            strokeWidth: 3,
            dash: [10, 5],
          }"
        />
        <!-- Wall/Door/Window preview while drawing -->
        <v-line
          v-if="isWallDrawingTool && editor.pendingPoints.length >= 2"
          :config="{
            points: editor.pendingPoints,
            stroke: drawingPreviewStyle.stroke,
            strokeWidth: drawingPreviewStyle.strokeWidth,
            lineCap: 'round',
          }"
        />
        <!-- Basic furniture rectangle preview -->
        <v-rect
          v-if="editor.activeTool === 'addBasicFurniture' && editor.pendingPoints.length >= 4"
          :config="{
            x: Math.min(editor.pendingPoints[0]!, editor.pendingPoints[2]!),
            y: Math.min(editor.pendingPoints[1]!, editor.pendingPoints[3]!),
            width: Math.abs(editor.pendingPoints[2]! - editor.pendingPoints[0]!),
            height: Math.abs(editor.pendingPoints[3]! - editor.pendingPoints[1]!),
            fill: '#90CAF9',
            opacity: 0.5,
            stroke: '#1976D2',
            strokeWidth: 1,
          }"
        />
      </v-layer>

      <!-- Persistent scale line layer -->
      <v-layer>
        <ScaleLineShape
          v-if="projectStore.project.scaleLine"
          :scale-line="projectStore.project.scaleLine"
          :is-selected="editor.selectedId === projectStore.project.scaleLine?.id"
        />
      </v-layer>

      <!-- Walls layer -->
      <v-layer>
        <WallShape
          v-for="wall in projectStore.project.walls"
          :key="wall.id"
          :wall="wall"
          :is-selected="editor.selectedId === wall.id"
          :is-highlighted="highlightedWallIds.has(wall.id)"
        />
      </v-layer>

      <!-- Room labels layer -->
      <v-layer>
        <RoomLabel
          v-for="room in projectStore.project.rooms"
          :key="room.id"
          :room="room"
          :is-selected="editor.selectedId === room.id"
        />
      </v-layer>

      <!-- Furniture layer -->
      <v-layer>
        <FurnitureItem
          v-for="item in sortedFurniture"
          :key="item.id"
          :item="item"
          :is-selected="editor.selectedId === item.id"
        />
      </v-layer>
    </v-stage>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useProjectStore } from '../../stores/project'
import { useEditorStore } from '../../stores/editor'
import WallShape from './WallShape.vue'
import ScaleLineShape from './ScaleLine.vue'
import RoomLabel from './RoomLabel.vue'
import FurnitureItem from './FurnitureItem.vue'

const projectStore = useProjectStore()
const editor = useEditorStore()

const containerRef = ref<HTMLElement>()
const stageRef = ref<any>()

const containerSize = ref({ width: 800, height: 600 })
const planImageObj = ref<HTMLImageElement | null>(null)

const sortedFurniture = computed(() =>
  [...projectStore.project.furniture].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
)

const highlightedWallIds = computed(() => {
  if (editor.selectedType !== 'room' || !editor.selectedId) return new Set<string>()
  const room = projectStore.project.rooms.find(r => r.id === editor.selectedId)
  return new Set(room?.wallIds ?? [])
})

const isWallDrawingTool = computed(() =>
  ['addWall', 'addDoor', 'addWindow'].includes(editor.activeTool)
)

const drawingPreviewStyle = computed(() => {
  const colorMap: Record<string, string> = { addWall: '#333333', addDoor: '#8D6E63', addWindow: '#64B5F6' }
  const thicknessMap: Record<string, number> = { addWall: 8, addDoor: 16, addWindow: 16 }
  return {
    stroke: colorMap[editor.activeTool] ?? '#333333',
    strokeWidth: thicknessMap[editor.activeTool] ?? 8,
  }
})

const canvasCursor = computed(() =>
  editor.activeTool === 'select' ? 'default' : 'crosshair'
)

const stageConfig = computed(() => ({
  width: containerSize.value.width,
  height: containerSize.value.height,
  scaleX: editor.zoom,
  scaleY: editor.zoom,
  x: editor.panOffset.x,
  y: editor.panOffset.y,
  draggable: editor.activeTool === 'select' && !editor.selectedId,
}))

// Watch for plan image changes
watch(
  () => projectStore.project.planImage,
  (src) => {
    if (src) {
      const img = new Image()
      img.onload = () => {
        planImageObj.value = img
      }
      img.src = src
    } else {
      planImageObj.value = null
    }
  },
  { immediate: true }
)

// Mouse state for drawing
const isDrawing = ref(false)

function getPointerPosition() {
  const stage = stageRef.value?.getStage()
  if (!stage) return null
  const pos = stage.getPointerPosition()
  if (!pos) return null
  return {
    x: (pos.x - editor.panOffset.x) / editor.zoom,
    y: (pos.y - editor.panOffset.y) / editor.zoom,
  }
}

function onWheel(e: any) {
  e.evt.preventDefault()
  const stage = stageRef.value?.getStage()
  if (!stage) return

  const evt = e.evt as WheelEvent

  // Pinch-to-zoom (ctrlKey) → zoom, two-finger scroll → pan
  if (evt.ctrlKey) {
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const scaleBy = 1.03
    const oldScale = editor.zoom
    const newScale = evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy
    const clampedScale = Math.max(0.1, Math.min(5, newScale))

    editor.zoom = clampedScale
    editor.panOffset = {
      x: pointer.x - ((pointer.x - editor.panOffset.x) / oldScale) * clampedScale,
      y: pointer.y - ((pointer.y - editor.panOffset.y) / oldScale) * clampedScale,
    }
  } else {
    editor.panOffset = {
      x: editor.panOffset.x - evt.deltaX,
      y: editor.panOffset.y - evt.deltaY,
    }
    stage.position(editor.panOffset)
  }
}

function onStageMouseDown() {
  const pos = getPointerPosition()
  if (!pos) return

  if (isWallDrawingTool.value || editor.activeTool === 'setScale' || editor.activeTool === 'addBasicFurniture') {
    if (editor.pendingPoints.length === 0) {
      editor.pendingPoints = [pos.x, pos.y]
      isDrawing.value = true
    }
  }
}

function onStageMouseMove() {
  if (!isDrawing.value) return
  const pos = getPointerPosition()
  if (!pos) return

  if (
    (isWallDrawingTool.value || editor.activeTool === 'setScale' || editor.activeTool === 'addBasicFurniture') &&
    editor.pendingPoints.length >= 2
  ) {
    const p0 = editor.pendingPoints[0]!
    const p1 = editor.pendingPoints[1]!
    editor.pendingPoints = [p0, p1, pos.x, pos.y]
  }
}

function onStageMouseUp() {
  if (!isDrawing.value) return
  isDrawing.value = false

  const pos = getPointerPosition()
  if (!pos) return

  const pts = editor.pendingPoints
  if (pts.length < 2) return

  const x1 = pts[0]!
  const y1 = pts[1]!
  const x2 = pos.x
  const y2 = pos.y

  const dist = Math.hypot(x2 - x1, y2 - y1)
  if (dist < 5) {
    editor.pendingPoints = []
    return
  }

  if (editor.activeTool === 'addBasicFurniture') {
    const rx = Math.min(x1, x2)
    const ry = Math.min(y1, y2)
    const rw = Math.abs(x2 - x1)
    const rh = Math.abs(y2 - y1)
    if (rw > 5 && rh > 5) {
      const item = projectStore.addBasicFurniture(rx, ry, rw, rh)
      editor.select(item.id, 'furniture')
    }
    editor.pendingPoints = []
  } else if (isWallDrawingTool.value) {
    const typeMap: Record<string, 'wall' | 'door' | 'window'> = { addWall: 'wall', addDoor: 'door', addWindow: 'window' }
    const wallType = typeMap[editor.activeTool] ?? 'wall'
    const wall = projectStore.addWall(x1, y1, x2, y2, wallType)
    editor.select(wall.id, wallType === 'wall' ? 'wall' : wallType === 'door' ? 'door' : 'window')
    editor.pendingPoints = []
  } else if (editor.activeTool === 'setScale') {
    const sl = projectStore.setScaleLine(x1, y1, x2, y2, 100)
    editor.select(sl.id, 'scaleLine')
    editor.pendingPoints = []
  }
}

function onStageClick(e: any) {
  const target = e.target
  const stage = stageRef.value?.getStage()
  if (target === stage) {
    editor.clearSelection()
  }

  if (editor.activeTool === 'addRoom') {
    const pos = getPointerPosition()
    if (pos) {
      const room = projectStore.addRoom('Room', pos.x, pos.y)
      editor.select(room.id, 'room')
      editor.setTool('select')
    }
  }
}

// Stage drag end -> update pan offset
watch(
  () => stageRef.value,
  (stage) => {
    if (!stage) return
    const konvaStage = stage.getStage()
    konvaStage.on('dragend', () => {
      editor.panOffset = {
        x: konvaStage.x(),
        y: konvaStage.y(),
      }
    })
  }
)

// Resize observer
let resizeObserver: ResizeObserver | null = null
onMounted(() => {
  if (containerRef.value) {
    const updateSize = () => {
      if (containerRef.value) {
        containerSize.value = {
          width: containerRef.value.clientWidth,
          height: containerRef.value.clientHeight,
        }
      }
    }
    resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(containerRef.value)
    updateSize()
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

// Keyboard shortcuts
function onKeyDown(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return

  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (editor.selectedId) {
      if (editor.selectedType === 'wall' || editor.selectedType === 'door' || editor.selectedType === 'window') {
        projectStore.deleteWall(editor.selectedId)
      } else if (editor.selectedType === 'room') {
        projectStore.deleteRoom(editor.selectedId)
      } else if (editor.selectedType === 'furniture') {
        projectStore.deleteFurniture(editor.selectedId)
      } else if (editor.selectedType === 'scaleLine') {
        projectStore.deleteScaleLine()
      }
      editor.clearSelection()
    }
  }
  if (e.key === 'Escape') {
    editor.setTool('select')
    editor.clearSelection()
  }
}

onMounted(() => window.addEventListener('keydown', onKeyDown))
onUnmounted(() => window.removeEventListener('keydown', onKeyDown))
</script>

<style scoped>
.canvas-container {
  width: 100%;
  height: 100%;
  background: #f5f5f5;
}
</style>
