<template>
  <v-group
    :config="{ draggable: true }"
    @click="onSelect"
    @dragend="onDragEnd"
  >
    <v-label
      :config="{
        x: room.x,
        y: room.y,
        opacity: 0.8,
      }"
    >
      <v-tag
        :config="{
          fill: isSelected ? '#1976D2' : '#424242',
          cornerRadius: 4,
          pointerDirection: 'down',
          pointerWidth: 10,
          pointerHeight: 6,
          shadowColor: 'black',
          shadowBlur: 4,
          shadowOffsetX: 1,
          shadowOffsetY: 1,
          shadowOpacity: 0.3,
        }"
      />
      <v-text
        :config="{
          text: room.text,
          fontSize: 28,
          fontStyle: 'bold',
          fill: 'white',
          padding: 6,
        }"
      />
    </v-label>
    <!-- Area text below room name -->
    <v-text
      v-if="areaText"
      :config="{
        x: room.x,
        y: room.y + 14,
        text: areaText,
        fontSize: 12,
        fill: '#1976D2',
        offsetX: areaText.length * 3,
      }"
    />
  </v-group>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProjectStore } from '../../stores/project'
import { useEditorStore } from '../../stores/editor'
import type { RoomLabel } from '../../types'

const props = defineProps<{
  room: RoomLabel
  isSelected: boolean
}>()

const projectStore = useProjectStore()
const editor = useEditorStore()

const areaText = computed(() => {
  const ids = props.room.wallIds ?? []
  if (ids.length < 3) return null

  const walls = ids
    .map(id => projectStore.project.walls.find(w => w.id === id))
    .filter(Boolean) as { points: [number, number, number, number] }[]

  if (walls.length < 3) return null

  const endpoints: [number, number][] = []
  for (const w of walls) {
    endpoints.push([w.points[0], w.points[1]])
    endpoints.push([w.points[2], w.points[3]])
  }

  let cx = 0, cy = 0
  for (const [x, y] of endpoints) { cx += x; cy += y }
  cx /= endpoints.length
  cy /= endpoints.length

  const unique: [number, number][] = []
  for (const pt of endpoints) {
    if (!unique.some(u => Math.hypot(u[0] - pt[0], u[1] - pt[1]) < 3)) unique.push(pt)
  }
  if (unique.length < 3) return null

  unique.sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx))

  let area = 0
  const n = unique.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += unique[i]![0] * unique[j]![1]
    area -= unique[j]![0] * unique[i]![1]
  }
  area = Math.abs(area) / 2

  const scale = projectStore.scale
  if (!scale) return `${Math.round(area)} px²`
  const areaM2 = area / (scale.pixelsPerCm * scale.pixelsPerCm) / 10000
  return `${areaM2.toFixed(2)} m²`
})

function onSelect() {
  if (editor.activeTool === 'select') {
    editor.select(props.room.id, 'room')
  }
}

function onDragEnd(e: any) {
  const node = e.target
  const dx = node.x()
  const dy = node.y()
  node.x(0)
  node.y(0)
  if (dx === 0 && dy === 0) return
  projectStore.updateRoom(props.room.id, {
    x: props.room.x + dx,
    y: props.room.y + dy,
  })
}
</script>
