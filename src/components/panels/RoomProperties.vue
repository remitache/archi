<template>
  <div class="pa-4">
    <div class="text-subtitle-2 mb-3">Room Label</div>

    <v-text-field
      :model-value="room.text"
      label="Room Name"
      density="compact"
      variant="outlined"
      class="mb-2"
      @update:model-value="updateText"
    />

    <div class="text-caption text-grey mb-2">
      Position: ({{ Math.round(room.x) }}, {{ Math.round(room.y) }})
    </div>

    <!-- Area display -->
    <v-text-field
      v-if="areaDisplay"
      :model-value="areaDisplay"
      label="Area"
      readonly
      density="compact"
      variant="outlined"
      class="mb-2"
    />

    <!-- Associated walls -->
    <div class="text-subtitle-2 mb-2">Walls ({{ wallIds.length }})</div>
    <div v-if="wallIds.length > 0" class="mb-2">
      <v-chip
        v-for="wid in wallIds"
        :key="wid"
        size="small"
        closable
        class="mr-1 mb-1"
        @click:close="removeWall(wid)"
      >
        {{ wallLabel(wid) }}
      </v-chip>
    </div>
    <v-btn size="small" variant="tonal" class="mb-3" @click="startPickWall">
      <v-icon start size="16">mdi-plus</v-icon>
      Add Wall
    </v-btn>

    <v-btn color="error" variant="outlined" block @click="deleteRoom">
      <v-icon start>mdi-delete</v-icon>
      Delete Label
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProjectStore } from '../../stores/project'
import { useEditorStore } from '../../stores/editor'
import type { RoomLabel } from '../../types'

const props = defineProps<{
  room: RoomLabel
}>()

const projectStore = useProjectStore()
const editor = useEditorStore()

const wallIds = computed(() => props.room.wallIds ?? [])

function updateText(val: string) {
  projectStore.updateRoom(props.room.id, { text: val })
}

function wallLabel(wid: string) {
  const wall = projectStore.project.walls.find(w => w.id === wid)
  if (!wall) return 'Missing'
  const type = wall.type ?? 'wall'
  const label = type.charAt(0).toUpperCase() + type.slice(1)
  const [x1, y1, x2, y2] = wall.points
  const len = Math.hypot(x2 - x1, y2 - y1)
  const scale = projectStore.scale
  if (scale) {
    const cm = len / scale.pixelsPerCm
    const display = cm >= 100 ? `${(cm / 100).toFixed(1)}m` : `${cm.toFixed(0)}cm`
    return `${label} (${display})`
  }
  return `${label} (${Math.round(len)}px)`
}

function removeWall(wid: string) {
  const updated = wallIds.value.filter(id => id !== wid)
  projectStore.updateRoom(props.room.id, { wallIds: updated })
}

function startPickWall() {
  editor.pickingRoomId = props.room.id
  editor.activeTool = 'pickWallForRoom'
  editor.selectedId = null
  editor.selectedType = null
}

// Area computation via Shoelace formula
const areaDisplay = computed(() => {
  const ids = wallIds.value
  if (ids.length < 3) return null

  const walls = ids
    .map(id => projectStore.project.walls.find(w => w.id === id))
    .filter(Boolean) as { points: [number, number, number, number] }[]

  if (walls.length < 3) return null

  // Collect all unique endpoints, then order them as polygon
  const endpoints: [number, number][] = []
  for (const w of walls) {
    endpoints.push([w.points[0], w.points[1]])
    endpoints.push([w.points[2], w.points[3]])
  }

  // Compute centroid
  let cx = 0, cy = 0
  for (const [x, y] of endpoints) {
    cx += x
    cy += y
  }
  cx /= endpoints.length
  cy /= endpoints.length

  // Remove near-duplicates
  const unique: [number, number][] = []
  for (const pt of endpoints) {
    const exists = unique.some(u => Math.hypot(u[0] - pt[0], u[1] - pt[1]) < 3)
    if (!exists) unique.push(pt)
  }

  if (unique.length < 3) return null

  // Sort by angle from centroid
  unique.sort((a, b) => {
    return Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx)
  })

  // Shoelace formula
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

  const areaCm2 = area / (scale.pixelsPerCm * scale.pixelsPerCm)
  const areaM2 = areaCm2 / 10000
  return `${areaM2.toFixed(2)} m²`
})

function deleteRoom() {
  projectStore.deleteRoom(props.room.id)
  editor.clearSelection()
}
</script>
