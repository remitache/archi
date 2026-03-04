<template>
  <v-dialog
    v-model="show"
    :fullscreen="fullscreen"
    :max-width="fullscreen ? undefined : 900"
    @keydown="onKeydown"
  >
    <v-card color="grey-darken-4" :class="{ 'fill-height': fullscreen }">
      <v-card-title class="d-flex align-center">
        <span class="text-white">Photos</span>
        <v-spacer />
        <span v-if="images.length" class="text-caption text-grey-lighten-1 mr-2">
          {{ currentIndex + 1 }} / {{ images.length }}
        </span>
        <v-btn icon size="small" variant="text" class="mr-1" @click="toggleFullscreen">
          <v-icon color="white">{{ fullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen' }}</v-icon>
        </v-btn>
        <v-btn icon size="small" variant="text" @click="show = false">
          <v-icon color="white">mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text
        class="d-flex align-center justify-center gallery-body"
        :style="{ minHeight: fullscreen ? undefined : '400px' }"
      >
        <template v-if="images.length">
          <v-btn
            icon
            variant="text"
            size="large"
            :disabled="currentIndex <= 0"
            class="gallery-nav gallery-nav--left"
            @click="prev"
          >
            <v-icon color="white">mdi-chevron-left</v-icon>
          </v-btn>

          <div
            ref="imageContainer"
            class="gallery-image-container"
            @wheel.prevent="onWheel"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
            @dblclick="onDblClick"
          >
            <img
              ref="imageEl"
              :src="images[currentIndex]?.data"
              class="gallery-image"
              :style="imageTransformStyle"
              draggable="false"
            />
          </div>

          <v-btn
            icon
            variant="text"
            size="large"
            :disabled="currentIndex >= images.length - 1"
            class="gallery-nav gallery-nav--right"
            @click="next"
          >
            <v-icon color="white">mdi-chevron-right</v-icon>
          </v-btn>
        </template>
        <div v-else class="text-grey text-center">No photos</div>
      </v-card-text>

      <v-card-actions v-if="images.length">
        <v-btn variant="text" size="small" :disabled="zoom <= MIN_ZOOM" @click="zoomOut">
          <v-icon start>mdi-magnify-minus-outline</v-icon>
          Zoom out
        </v-btn>
        <span class="text-caption text-grey-lighten-1 mx-1">{{ Math.round(zoom * 100) }}%</span>
        <v-btn variant="text" size="small" :disabled="zoom >= MAX_ZOOM" @click="zoomIn">
          <v-icon start>mdi-magnify-plus-outline</v-icon>
          Zoom in
        </v-btn>
        <v-btn v-if="zoom !== 1" variant="text" size="small" @click="resetZoom">
          Reset
        </v-btn>
        <v-spacer />
        <v-btn color="error" variant="text" @click="deleteCurrent">
          <v-icon start>mdi-delete</v-icon>
          Delete
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { RoomImage } from '../../types'

const props = defineProps<{
  modelValue: boolean
  images: RoomImage[]
  startIndex?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  delete: [imageId: string]
}>()

const show = ref(props.modelValue)
const currentIndex = ref(0)
const fullscreen = ref(false)

// Zoom & pan state
const MIN_ZOOM = 0.5
const MAX_ZOOM = 5
const ZOOM_STEP = 0.1
const WHEEL_SENSITIVITY = 0.002

const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)
const dragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const panStartX = ref(0)
const panStartY = ref(0)

const imageContainer = ref<HTMLElement | null>(null)

const imageTransformStyle = computed(() => ({
  transform: `translate(${panX.value}px, ${panY.value}px) scale(${zoom.value})`,
  cursor: zoom.value > 1 ? (dragging.value ? 'grabbing' : 'grab') : 'default',
}))

function resetZoom() {
  zoom.value = 1
  panX.value = 0
  panY.value = 0
}

function clampZoom(val: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, val))
}

function zoomIn() {
  zoom.value = clampZoom(zoom.value + ZOOM_STEP)
  if (zoom.value === 1) { panX.value = 0; panY.value = 0 }
}

function zoomOut() {
  zoom.value = clampZoom(zoom.value - ZOOM_STEP)
  if (zoom.value === 1) { panX.value = 0; panY.value = 0 }
}

function onWheel(e: WheelEvent) {
  const scaledDelta = -e.deltaY * WHEEL_SENSITIVITY * zoom.value
  const newZoom = clampZoom(zoom.value + scaledDelta)
  if (newZoom === zoom.value) return

  // Zoom toward cursor position
  const container = imageContainer.value
  if (container) {
    const rect = container.getBoundingClientRect()
    const cx = e.clientX - rect.left - rect.width / 2
    const cy = e.clientY - rect.top - rect.height / 2
    const factor = newZoom / zoom.value
    panX.value = cx - factor * (cx - panX.value)
    panY.value = cy - factor * (cy - panY.value)
  }

  zoom.value = newZoom
  if (zoom.value === 1) { panX.value = 0; panY.value = 0 }
}

function onPointerDown(e: PointerEvent) {
  if (zoom.value <= 1) return
  dragging.value = true
  dragStartX.value = e.clientX
  dragStartY.value = e.clientY
  panStartX.value = panX.value
  panStartY.value = panY.value
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value) return
  panX.value = panStartX.value + (e.clientX - dragStartX.value)
  panY.value = panStartY.value + (e.clientY - dragStartY.value)
}

function onPointerUp() {
  dragging.value = false
}

function onDblClick() {
  if (zoom.value === 1) {
    zoom.value = 2
  } else {
    resetZoom()
  }
}

// Navigation
function prev() {
  if (currentIndex.value > 0) {
    currentIndex.value--
    resetZoom()
  }
}

function next() {
  if (currentIndex.value < props.images.length - 1) {
    currentIndex.value++
    resetZoom()
  }
}

function deleteCurrent() {
  const img = props.images[currentIndex.value]
  if (img) emit('delete', img.id)
}

function toggleFullscreen() {
  fullscreen.value = !fullscreen.value
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft') prev()
  else if (e.key === 'ArrowRight') next()
  else if (e.key === '+' || e.key === '=') zoomIn()
  else if (e.key === '-') zoomOut()
  else if (e.key === '0') resetZoom()
  else if (e.key === 'f') toggleFullscreen()
}

// Watchers
watch(() => props.modelValue, (val) => {
  show.value = val
  if (val) {
    currentIndex.value = props.startIndex ?? 0
    resetZoom()
  }
})

watch(show, (val) => {
  emit('update:modelValue', val)
  if (!val) {
    fullscreen.value = false
    resetZoom()
  }
})

watch(() => props.images.length, (len) => {
  if (currentIndex.value >= len) {
    currentIndex.value = Math.max(0, len - 1)
  }
})
</script>

<style scoped>
.gallery-body {
  position: relative;
  overflow: hidden;
  flex: 1;
}

.gallery-nav {
  position: absolute;
  z-index: 1;
}
.gallery-nav--left {
  left: 8px;
}
.gallery-nav--right {
  right: 8px;
}

.gallery-image-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  touch-action: none;
  user-select: none;
}

.gallery-image {
  max-width: 100%;
  max-height: 60vh;
  object-fit: contain;
  border-radius: 4px;
  transform-origin: center center;
  transition: transform 0.1s ease-out;
}

.fill-height .gallery-body {
  height: calc(100vh - 112px);
}

.fill-height .gallery-image {
  max-height: calc(100vh - 140px);
}
</style>
