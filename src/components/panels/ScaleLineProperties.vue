<template>
  <div class="pa-4">
    <div class="text-subtitle-2 mb-3">Scale Line</div>

    <v-text-field
      :model-value="scaleLine.distanceCm"
      label="Distance (cm)"
      type="number"
      :min="1"
      density="compact"
      variant="outlined"
      class="mb-2"
      @update:model-value="updateDistance"
    />

    <v-text-field
      :model-value="scaleDisplay"
      label="Scale (px/cm)"
      readonly
      density="compact"
      variant="outlined"
      class="mb-2"
    />

    <div class="text-caption text-grey mb-2">
      Start: ({{ Math.round(scaleLine.points[0]) }}, {{ Math.round(scaleLine.points[1]) }})
      <br />
      End: ({{ Math.round(scaleLine.points[2]) }}, {{ Math.round(scaleLine.points[3]) }})
    </div>

    <v-btn color="error" variant="outlined" block @click="deleteScale">
      <v-icon start>mdi-delete</v-icon>
      Delete Scale Line
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProjectStore } from '../../stores/project'
import { useEditorStore } from '../../stores/editor'
import type { ScaleLine } from '../../types'

const props = defineProps<{
  scaleLine: ScaleLine
}>()

const projectStore = useProjectStore()
const editor = useEditorStore()

const scaleDisplay = computed(() => {
  const s = projectStore.scale
  if (!s) return 'N/A'
  return `${s.pixelsPerCm.toFixed(2)}`
})

function updateDistance(val: number | string) {
  const num = Number(val)
  if (num > 0) {
    projectStore.updateScaleLine({ distanceCm: num })
  }
}

function deleteScale() {
  projectStore.deleteScaleLine()
  editor.clearSelection()
}
</script>
