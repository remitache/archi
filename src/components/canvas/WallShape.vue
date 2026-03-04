<template>
  <v-group :config="{ opacity: wall.hidden ? 0.1 : 1 }">
    <v-line
      :config="{
        points: wall.points,
        stroke: wallColor,
        strokeWidth: wall.thickness,
        lineCap: 'round',
        hitStrokeWidth: 20,
        draggable: isSelected,
      }"
      @click="onSelect"
      @dragend="onDragEnd"
    />
    <!-- Measurement label -->
    <v-text
      v-if="lengthText"
      :config="{
        x: midX,
        y: midY - 20,
        text: lengthText,
        fontSize: 14,
        fill: '#1976D2',
        offsetX: lengthText.length * 3.5,
      }"
    />
    <!-- Selection handles -->
    <template v-if="isSelected">
      <v-circle
        :config="{
          x: wall.points[0],
          y: wall.points[1],
          radius: 6,
          fill: '#1976D2',
          stroke: 'white',
          strokeWidth: 2,
          draggable: true,
        }"
        @dragmove="onDragHandle1"
        @dragend="onHandleDragEnd"
      />
      <v-circle
        :config="{
          x: wall.points[2],
          y: wall.points[3],
          radius: 6,
          fill: '#1976D2',
          stroke: 'white',
          strokeWidth: 2,
          draggable: true,
        }"
        @dragmove="onDragHandle2"
        @dragend="onHandleDragEnd"
      />
    </template>
  </v-group>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProjectStore } from '../../stores/project'
import { useEditorStore } from '../../stores/editor'
import type { Wall } from '../../types'

const props = defineProps<{
  wall: Wall
  isSelected: boolean
  isHighlighted?: boolean
}>()

const projectStore = useProjectStore()
const editor = useEditorStore()

const wallColor = computed(() => {
  if (props.isSelected) return '#4CAF50'
  if (props.isHighlighted) return '#4CAF50'
  const colorMap: Record<string, string> = { wall: '#333333', door: '#8D6E63', window: '#64B5F6' }
  return colorMap[props.wall.type ?? 'wall'] ?? props.wall.color
})

const wallSelectType = computed(() => props.wall.type ?? 'wall')

const midX = computed(() => (props.wall.points[0] + props.wall.points[2]) / 2)
const midY = computed(() => (props.wall.points[1] + props.wall.points[3]) / 2)

const pixelLength = computed(() => {
  const [x1, y1, x2, y2] = props.wall.points
  return Math.hypot(x2 - x1, y2 - y1)
})

const lengthText = computed(() => {
  const scale = projectStore.scale
  if (!scale) return `${Math.round(pixelLength.value)}px`
  const cm = pixelLength.value / scale.pixelsPerCm
  if (cm >= 100) return `${(cm / 100).toFixed(2)}m`
  return `${cm.toFixed(1)}cm`
})

function onSelect() {
  if (editor.activeTool === 'pickWallForRoom' && editor.pickingRoomId) {
    const room = projectStore.project.rooms.find(r => r.id === editor.pickingRoomId)
    if (room) {
      const wallIds = room.wallIds ? [...room.wallIds] : []
      if (!wallIds.includes(props.wall.id)) {
        wallIds.push(props.wall.id)
        projectStore.updateRoom(room.id, { wallIds })
      }
      editor.activeTool = 'select'
      editor.select(room.id, 'room')
    }
    return
  }
  if (editor.activeTool === 'select') {
    editor.select(props.wall.id, wallSelectType.value)
  }
}

function onDragEnd(e: any) {
  const node = e.target
  const dx = node.x()
  const dy = node.y()
  node.x(0)
  node.y(0)
  projectStore.updateWall(props.wall.id, {
    points: [
      props.wall.points[0] + dx,
      props.wall.points[1] + dy,
      props.wall.points[2] + dx,
      props.wall.points[3] + dy,
    ],
  })
}

function onDragHandle1(e: any) {
  const node = e.target
  projectStore.updateWall(props.wall.id, {
    points: [node.x(), node.y(), props.wall.points[2], props.wall.points[3]],
  })
}

function onDragHandle2(e: any) {
  const node = e.target
  projectStore.updateWall(props.wall.id, {
    points: [props.wall.points[0], props.wall.points[1], node.x(), node.y()],
  })
}

function onHandleDragEnd() {
  projectStore.persist()
}
</script>
