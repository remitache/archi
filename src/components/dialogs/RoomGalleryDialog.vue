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
            :disabled="currentIndex <= 0 || generating || cropping"
            class="gallery-nav gallery-nav--left"
            @click="prev"
          >
            <v-icon color="white">mdi-chevron-left</v-icon>
          </v-btn>

          <!-- Before/After comparison slider -->
          <div
            v-if="compareMode"
            ref="compareContainer"
            class="compare-container"
          >
            <img :src="sourceImage!.data" class="compare-image" draggable="false" />
            <div class="compare-overlay" :style="{ clipPath: `inset(0 0 0 ${sliderPos}%)` }">
              <img :src="currentImage!.data" class="compare-image" draggable="false" />
            </div>
            <div
              class="compare-slider"
              :style="{ left: sliderPos + '%' }"
              @pointerdown="onSliderPointerDown"
            >
              <div class="compare-slider-line"></div>
              <div class="compare-slider-handle">
                <v-icon size="16" color="white">mdi-arrow-left-right</v-icon>
              </div>
            </div>
            <span class="compare-label compare-label--before">Before</span>
            <span class="compare-label compare-label--after">After</span>
          </div>

          <!-- Crop mode -->
          <div v-else-if="cropping" class="crop-container">
            <img
              ref="cropImageEl"
              :src="images[currentIndex]?.data"
              class="crop-source-image"
            />
          </div>

          <!-- Normal single image view -->
          <div
            v-else
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
            <!-- Loading overlay -->
            <div v-if="generating" class="generating-overlay">
              <v-progress-circular indeterminate color="white" size="48" />
              <div class="text-white mt-3">Generating...</div>
            </div>
          </div>

          <v-btn
            icon
            variant="text"
            size="large"
            :disabled="currentIndex >= images.length - 1 || generating || cropping"
            class="gallery-nav gallery-nav--right"
            @click="next"
          >
            <v-icon color="white">mdi-chevron-right</v-icon>
          </v-btn>
        </template>
        <div v-else class="text-grey text-center">No photos</div>
      </v-card-text>

      <!-- AI Edit prompt area -->
      <div v-if="aiEditOpen && images.length && !cropping" class="px-4 pb-2">
        <!-- Backend mode toggle -->
        <v-btn-toggle
          v-model="backendMode"
          mandatory
          density="compact"
          color="primary"
          class="mb-3"
          :disabled="generating"
        >
          <v-btn value="cloud" size="small">
            <v-icon start size="16">mdi-cloud</v-icon>
            Cloud
          </v-btn>
          <v-btn value="local" size="small">
            <v-icon start size="16">mdi-desktop-tower</v-icon>
            Local
          </v-btn>
        </v-btn-toggle>

        <!-- Cloud mode: token input -->
        <div v-if="backendMode === 'cloud' && !hasToken">
          <div class="d-flex align-center ga-2 mb-1">
            <v-text-field
              v-model="tokenInput"
              label="HuggingFace API Token"
              type="password"
              density="compact"
              hide-details
              variant="outlined"
              placeholder="hf_..."
            />
            <v-btn color="primary" variant="flat" :disabled="!tokenInput.trim()" @click="saveToken">
              Save
            </v-btn>
            <v-btn
              variant="text"
              size="small"
              href="https://huggingface.co/settings/tokens/new?tokenType=fineGrained&globalPermissions=inference-providers-api"
              target="_blank"
            >
              Get token
            </v-btn>
          </div>
          <div class="text-caption text-grey-lighten-1 mb-2">
            Create a fine-grained token with the "Make calls to Inference Providers" permission enabled.
          </div>
        </div>

        <!-- Local mode: URL config -->
        <div v-if="backendMode === 'local'">
          <div class="d-flex align-center ga-2 mb-2">
            <v-text-field
              v-model="localUrlInput"
              label="Stable Diffusion WebUI URL"
              density="compact"
              hide-details
              variant="outlined"
              placeholder="http://127.0.0.1:7860"
              :disabled="generating"
              @change="saveLocalUrl"
            />
          </div>
          <div class="text-caption text-grey-lighten-1 mb-2">
            Run Stable Diffusion WebUI with API enabled: <code>./webui.sh --api</code>
          </div>
        </div>

        <!-- Prompt input (shared by both modes) -->
        <div v-if="backendMode === 'local' || (backendMode === 'cloud' && hasToken)">
          <div class="text-caption text-grey-lighten-1 mb-2 font-italic">
            "{{ SYSTEM_PROMPT }}"
          </div>
          <div class="d-flex align-center ga-2">
            <v-text-field
              v-model="promptText"
              label="Your instructions..."
              density="compact"
              hide-details
              variant="outlined"
              placeholder="e.g. modern style with white walls and hardwood floors"
              :disabled="generating"
              @keydown.enter="runGenerate"
            />
            <v-select
              v-if="backendMode === 'cloud'"
              v-model="selectedProvider"
              :items="PROVIDERS"
              item-title="label"
              item-value="value"
              density="compact"
              hide-details
              variant="outlined"
              style="max-width: 150px"
              :disabled="generating"
            />
            <v-btn
              color="primary"
              variant="flat"
              :disabled="!promptText.trim() || generating"
              :loading="generating"
              @click="runGenerate"
            >
              Generate
            </v-btn>
          </div>
          <div v-if="backendMode === 'cloud'" class="text-caption text-grey-lighten-1 mt-1">
            Free HuggingFace accounts get $0.10/month in credits. If a provider fails, try another.
          </div>
          <div v-else class="text-caption text-grey-lighten-1 mt-1">
            Free local generation using your GPU. No cloud credits needed.
          </div>
        </div>

        <div v-if="errorMsg" class="d-flex align-center ga-2 mt-1">
          <span class="text-error text-caption">{{ errorMsg }}</span>
          <v-btn v-if="backendMode === 'cloud'" variant="text" size="x-small" color="warning" @click="resetToken">Change token</v-btn>
        </div>
      </div>

      <!-- Crop action bar -->
      <v-card-actions v-if="images.length && cropping">
        <v-spacer />
        <v-btn variant="text" size="small" @click="cancelCrop">
          Cancel
        </v-btn>
        <v-btn color="primary" variant="flat" size="small" @click="applyCrop">
          <v-icon start>mdi-crop</v-icon>
          Apply Crop
        </v-btn>
      </v-card-actions>

      <!-- Normal action bar -->
      <v-card-actions v-if="images.length && !cropping">
        <v-btn variant="text" size="small" :disabled="zoom <= MIN_ZOOM || compareMode" @click="zoomOut">
          <v-icon start>mdi-magnify-minus-outline</v-icon>
          Zoom out
        </v-btn>
        <span class="text-caption text-grey-lighten-1 mx-1">{{ Math.round(zoom * 100) }}%</span>
        <v-btn variant="text" size="small" :disabled="zoom >= MAX_ZOOM || compareMode" @click="zoomIn">
          <v-icon start>mdi-magnify-plus-outline</v-icon>
          Zoom in
        </v-btn>
        <v-btn v-if="zoom !== 1 && !compareMode" variant="text" size="small" @click="resetZoom">
          Reset
        </v-btn>
        <v-spacer />
        <v-btn
          v-if="canShowCompare"
          variant="text"
          size="small"
          @click="forceCompare = !forceCompare"
        >
          <v-icon start>{{ forceCompare ? 'mdi-image' : 'mdi-compare' }}</v-icon>
          {{ forceCompare ? 'Single' : 'Compare' }}
        </v-btn>
        <v-btn
          variant="text"
          size="small"
          :disabled="generating || compareMode"
          @click="enterCropMode"
        >
          <v-icon start>mdi-crop</v-icon>
          Crop
        </v-btn>
        <v-btn
          variant="text"
          size="small"
          :disabled="generating"
          @click="aiEditOpen = !aiEditOpen"
        >
          <v-icon start>mdi-auto-fix</v-icon>
          AI Edit
        </v-btn>
        <v-btn color="error" variant="text" :disabled="generating" @click="deleteCurrent">
          <v-icon start>mdi-delete</v-icon>
          Delete
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'
import type { RoomImage } from '../../types'
import {
  getHfToken, setHfToken, generateImageEdit, getProvider, setProvider,
  PROVIDERS, SYSTEM_PROMPT, type Provider,
  getBackendMode, setBackendMode, type BackendMode,
  getLocalUrl, setLocalUrl,
} from '../../services/aiImageGeneration'
import { useProjectStore } from '../../stores/project'

const props = defineProps<{
  modelValue: boolean
  images: RoomImage[]
  startIndex?: number
  roomId: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  delete: [imageId: string]
}>()

const projectStore = useProjectStore()

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

// Crop state
const cropping = ref(false)
const cropImageEl = ref<HTMLImageElement | null>(null)
let cropperInstance: Cropper | null = null

function enterCropMode() {
  resetZoom()
  cropping.value = true
  nextTick(() => {
    if (cropImageEl.value) {
      cropperInstance = new Cropper(cropImageEl.value, {
        viewMode: 1,
        autoCropArea: 0.8,
        rotatable: false,
        scalable: false,
      })
    }
  })
}

function cancelCrop() {
  if (cropperInstance) {
    cropperInstance.destroy()
    cropperInstance = null
  }
  cropping.value = false
}

function applyCrop() {
  if (!cropperInstance) return
  const img = props.images[currentIndex.value]
  if (!img) return
  const croppedData = cropperInstance.getCroppedCanvas().toDataURL('image/jpeg', 0.85)
  projectStore.updateRoomImage(props.roomId, img.id, croppedData)
  cropperInstance.destroy()
  cropperInstance = null
  cropping.value = false
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
  if (generating.value || cropping.value) return
  const tag = (e.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return

  if (e.key === 'ArrowLeft') prev()
  else if (e.key === 'ArrowRight') next()
  else if (e.key === '+' || e.key === '=') zoomIn()
  else if (e.key === '-') zoomOut()
  else if (e.key === '0') resetZoom()
  else if (e.key === 'f') toggleFullscreen()
}

// --- AI Edit state ---
const aiEditOpen = ref(false)
const backendMode = ref<BackendMode>(getBackendMode())
const tokenInput = ref('')
const hasToken = ref(!!getHfToken())
const promptText = ref('')
const selectedProvider = ref<Provider>(getProvider())
const localUrlInput = ref(getLocalUrl())
const generating = ref(false)
const errorMsg = ref('')

watch(backendMode, (mode) => {
  setBackendMode(mode)
  errorMsg.value = ''
})

function saveToken() {
  const t = tokenInput.value.trim()
  if (t) {
    setHfToken(t)
    hasToken.value = true
    tokenInput.value = ''
    errorMsg.value = ''
  }
}

function resetToken() {
  hasToken.value = false
  errorMsg.value = ''
}

function saveLocalUrl() {
  const url = localUrlInput.value.trim()
  if (url) setLocalUrl(url)
}

async function runGenerate() {
  const prompt = promptText.value.trim()
  if (!prompt) return
  const img = props.images[currentIndex.value]
  if (!img) return
  if (backendMode.value === 'cloud') setProvider(selectedProvider.value)
  if (backendMode.value === 'local') saveLocalUrl()

  generating.value = true
  errorMsg.value = ''
  try {
    const resultBase64 = await generateImageEdit(img.data, prompt)
    projectStore.addRoomImage(props.roomId, resultBase64, {
      sourceImageId: img.id,
      prompt,
    })
    // Switch to the newly added image (it's the last one)
    currentIndex.value = props.images.length // will be length after reactivity
    promptText.value = ''
    aiEditOpen.value = false
    forceCompare.value = true
  } catch (e: any) {
    errorMsg.value = e?.message || 'Generation failed'
  } finally {
    generating.value = false
  }
}

// --- Before/After comparison ---
const forceCompare = ref(false)
const sliderPos = ref(50)
const compareContainer = ref<HTMLElement | null>(null)

const currentImage = computed(() => props.images[currentIndex.value] ?? null)

const sourceImage = computed(() => {
  const cur = currentImage.value
  if (!cur?.sourceImageId) return null
  return props.images.find((img) => img.id === cur.sourceImageId) ?? null
})

const canShowCompare = computed(() => !!sourceImage.value)

const compareMode = computed(() => canShowCompare.value && forceCompare.value)

function onSliderPointerDown(e: PointerEvent) {
  e.preventDefault()
  const container = compareContainer.value
  if (!container) return
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)

  const onMove = (ev: PointerEvent) => {
    const rect = container.getBoundingClientRect()
    const x = ev.clientX - rect.left
    sliderPos.value = Math.max(0, Math.min(100, (x / rect.width) * 100))
  }
  const onUp = () => {
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup', onUp)
  }
  document.addEventListener('pointermove', onMove)
  document.addEventListener('pointerup', onUp)
}

// Watchers
watch(() => props.modelValue, (val) => {
  show.value = val
  if (val) {
    currentIndex.value = props.startIndex ?? 0
    resetZoom()
    aiEditOpen.value = false
    forceCompare.value = false
    errorMsg.value = ''
    hasToken.value = !!getHfToken()
    backendMode.value = getBackendMode()
    localUrlInput.value = getLocalUrl()
  }
})

watch(show, (val) => {
  emit('update:modelValue', val)
  if (!val) {
    fullscreen.value = false
    resetZoom()
    if (cropping.value) cancelCrop()
  }
})

watch(() => props.images.length, (len) => {
  if (currentIndex.value >= len) {
    currentIndex.value = Math.max(0, len - 1)
  }
})

// Auto-enable compare mode when navigating to an AI-generated image
watch(currentIndex, () => {
  resetZoom()
  sliderPos.value = 50
  forceCompare.value = !!sourceImage.value
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
  position: relative;
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

/* Generating overlay */
.generating-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  z-index: 2;
}

/* Before/After comparison */
.compare-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  user-select: none;
  touch-action: none;
}

.compare-image {
  max-width: 100%;
  max-height: 60vh;
  object-fit: contain;
  border-radius: 4px;
  display: block;
}

.fill-height .compare-image {
  max-height: calc(100vh - 140px);
}

.compare-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.compare-slider {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 4px;
  transform: translateX(-50%);
  cursor: ew-resize;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.compare-slider-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: white;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
}

.compare-slider-handle {
  position: relative;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(50, 50, 50, 0.8);
  border: 2px solid white;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}

.compare-label {
  position: absolute;
  top: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  font-size: 12px;
  z-index: 1;
  pointer-events: none;
}
.compare-label--before {
  left: 12px;
}
.compare-label--after {
  right: 12px;
}

/* Crop mode */
.crop-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.crop-source-image {
  max-width: 100%;
  max-height: 60vh;
  display: block;
}

.fill-height .crop-source-image {
  max-height: calc(100vh - 140px);
}
</style>
