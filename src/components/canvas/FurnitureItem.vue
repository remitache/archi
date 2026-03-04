<template>
  <!-- Basic rectangle furniture -->
  <v-rect
    v-if="isBasic"
    ref="shapeRef"
    :config="{
      x: item.x,
      y: item.y,
      width: item.width ?? 50,
      height: item.height ?? 50,
      fill: item.fillColor ?? '#90CAF9',
      stroke: isSelected ? '#1976D2' : undefined,
      strokeWidth: isSelected ? 2 : 0,
      rotation: item.rotation,
      scaleX: item.scaleX,
      scaleY: item.scaleY,
      draggable: true,
      name: 'furniture-' + item.id,
    }"
    @click="onSelect"
    @dragend="onDragEnd"
    @transformend="onTransformEnd"
  />
  <!-- Image furniture -->
  <v-image
    v-else-if="imageObj"
    ref="shapeRef"
    :config="{
      image: imageObj,
      x: item.x,
      y: item.y,
      rotation: item.rotation,
      scaleX: item.scaleX,
      scaleY: item.scaleY,
      draggable: true,
      name: 'furniture-' + item.id,
    }"
    @click="onSelect"
    @dragend="onDragEnd"
    @transformend="onTransformEnd"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useProjectStore } from '../../stores/project'
import { useEditorStore } from '../../stores/editor'
import type { FurnitureItem } from '../../types'
import Konva from 'konva'

const props = defineProps<{
  item: FurnitureItem
  isSelected: boolean
}>()

const projectStore = useProjectStore()
const editor = useEditorStore()

const isBasic = computed(() => !props.item.imageData && props.item.width != null && props.item.height != null)

const imageObj = ref<HTMLImageElement | null>(null)
const shapeRef = ref<any>()

// Load image (only for image furniture)
watch(
  () => props.item.imageData,
  (src) => {
    if (!src) {
      imageObj.value = null
      return
    }
    const img = new Image()
    img.onload = () => {
      imageObj.value = img
    }
    img.src = src
  },
  { immediate: true }
)

// Transformer management
let transformer: Konva.Transformer | null = null

watch(
  () => props.isSelected,
  (selected) => {
    if (!shapeRef.value) return
    const node = shapeRef.value.getNode()
    const layer = node.getLayer()

    if (selected && layer) {
      transformer = new Konva.Transformer({
        nodes: [node],
        rotateEnabled: true,
        keepRatio: !isBasic.value,
        enabledAnchors: isBasic.value
          ? ['top-left', 'top-center', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right']
          : ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      })
      layer.add(transformer)
      layer.draw()
    } else if (transformer) {
      transformer.destroy()
      transformer = null
      layer?.draw()
    }
  }
)

onBeforeUnmount(() => {
  if (transformer) {
    transformer.destroy()
    transformer = null
  }
})

function onSelect() {
  if (editor.activeTool === 'select') {
    editor.select(props.item.id, 'furniture')
  }
}

function onDragEnd(e: any) {
  const node = e.target
  projectStore.updateFurniture(props.item.id, {
    x: node.x(),
    y: node.y(),
  })
}

function onTransformEnd(e: any) {
  const node = e.target
  projectStore.updateFurniture(props.item.id, {
    x: node.x(),
    y: node.y(),
    rotation: node.rotation(),
    scaleX: node.scaleX(),
    scaleY: node.scaleY(),
  })
}
</script>
