<template>
  <div class="pa-4">
    <div class="text-subtitle-2 mb-3">Furniture</div>

    <v-text-field
      :model-value="item.name"
      label="Name"
      density="compact"
      variant="outlined"
      class="mb-3"
      @update:model-value="updateName"
    />

    <v-text-field
      v-if="isBasic"
      :model-value="item.fillColor ?? '#90CAF9'"
      label="Fill Color"
      type="color"
      density="compact"
      variant="outlined"
      class="mb-2"
      @update:model-value="updateFillColor"
    />

    <div v-if="dimensionsDisplay" class="text-caption text-grey mb-2">
      {{ dimensionsDisplay }}
    </div>

    <div class="d-flex gap-2 mb-3">
      <v-btn size="small" variant="outlined" @click="bringForward">
        <v-icon start size="16">mdi-arrange-bring-forward</v-icon>
        Forward
      </v-btn>
      <v-btn size="small" variant="outlined" @click="sendBackward">
        <v-icon start size="16">mdi-arrange-send-backward</v-icon>
        Backward
      </v-btn>
    </div>

    <v-btn color="error" variant="outlined" block @click="deleteFurniture">
      <v-icon start>mdi-delete</v-icon>
      Delete
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useProjectStore } from '../../stores/project'
import { useEditorStore } from '../../stores/editor'
import type { FurnitureItem } from '../../types'

const props = defineProps<{
  item: FurnitureItem
}>()

const projectStore = useProjectStore()
const editor = useEditorStore()

const isBasic = computed(() => !props.item.imageData && props.item.width != null && props.item.height != null)

// For image furniture, load image to get natural dimensions
const imageSize = ref<{ width: number; height: number } | null>(null)
watch(
  () => props.item.imageData,
  (src) => {
    if (!src) { imageSize.value = null; return }
    const img = new Image()
    img.onload = () => { imageSize.value = { width: img.naturalWidth, height: img.naturalHeight } }
    img.src = src
  },
  { immediate: true }
)

function formatDim(px: number) {
  const scale = projectStore.scale
  if (!scale) return `${Math.round(px)} px`
  const cm = px / scale.pixelsPerCm
  if (cm >= 100) return `${(cm / 100).toFixed(2)} m`
  return `${cm.toFixed(1)} cm`
}

const dimensionsDisplay = computed(() => {
  let w: number
  let h: number
  if (isBasic.value) {
    w = (props.item.width ?? 0) * Math.abs(props.item.scaleX)
    h = (props.item.height ?? 0) * Math.abs(props.item.scaleY)
  } else if (imageSize.value) {
    w = imageSize.value.width * Math.abs(props.item.scaleX)
    h = imageSize.value.height * Math.abs(props.item.scaleY)
  } else {
    return null
  }
  return `Dimensions: ${formatDim(w)} x ${formatDim(h)}`
})

function updateName(val: string) {
  projectStore.updateFurniture(props.item.id, { name: val })
}

function updateFillColor(val: string) {
  projectStore.updateFurniture(props.item.id, { fillColor: val })
}

function bringForward() {
  projectStore.updateFurniture(props.item.id, { zIndex: (props.item.zIndex ?? 0) + 1 })
}

function sendBackward() {
  projectStore.updateFurniture(props.item.id, { zIndex: (props.item.zIndex ?? 0) - 1 })
}

function deleteFurniture() {
  projectStore.deleteFurniture(props.item.id)
  editor.clearSelection()
}
</script>
