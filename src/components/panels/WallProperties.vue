<template>
  <div class="pa-4">
    <div class="text-subtitle-2 mb-3">{{ typeLabel }}</div>

    <v-text-field
      :model-value="lengthDisplay"
      label="Length"
      readonly
      density="compact"
      variant="outlined"
      class="mb-2"
    />

    <div class="text-caption text-grey mb-2">
      Start: ({{ Math.round(wall.points[0]) }}, {{ Math.round(wall.points[1]) }})
      <br />
      End: ({{ Math.round(wall.points[2]) }}, {{ Math.round(wall.points[3]) }})
    </div>

    <v-btn
      variant="outlined"
      block
      class="mb-2"
      @click="toggleHidden"
    >
      <v-icon start>{{ wall.hidden ? 'mdi-eye-off' : 'mdi-eye' }}</v-icon>
      {{ wall.hidden ? 'Show' : 'Hide' }}
    </v-btn>

    <v-btn color="error" variant="outlined" block @click="deleteWall">
      <v-icon start>mdi-delete</v-icon>
      Delete {{ typeLabel }}
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProjectStore } from '../../stores/project'
import { useEditorStore } from '../../stores/editor'
import type { Wall } from '../../types'

const props = defineProps<{
  wall: Wall
}>()

const projectStore = useProjectStore()
const editor = useEditorStore()

const typeLabel = computed(() => {
  const labels: Record<string, string> = { wall: 'Wall', door: 'Door', window: 'Window' }
  return labels[props.wall.type ?? 'wall'] ?? 'Wall'
})

const pixelLength = computed(() => {
  const [x1, y1, x2, y2] = props.wall.points
  return Math.hypot(x2 - x1, y2 - y1)
})

const lengthDisplay = computed(() => {
  const scale = projectStore.scale
  if (!scale) return `${Math.round(pixelLength.value)} px`
  const cm = pixelLength.value / scale.pixelsPerCm
  if (cm >= 100) return `${(cm / 100).toFixed(2)} m`
  return `${cm.toFixed(1)} cm`
})

function toggleHidden() {
  projectStore.updateWall(props.wall.id, { hidden: !props.wall.hidden })
}

function deleteWall() {
  projectStore.deleteWall(props.wall.id)
  editor.clearSelection()
}
</script>
