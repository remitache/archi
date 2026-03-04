<template>
  <v-dialog v-model="show" max-width="900" @keydown="onKeydown">
    <v-card color="grey-darken-4">
      <v-card-title class="d-flex align-center">
        <span class="text-white">Photos</span>
        <v-spacer />
        <span v-if="images.length" class="text-caption text-grey-lighten-1 mr-2">
          {{ currentIndex + 1 }} / {{ images.length }}
        </span>
        <v-btn icon size="small" variant="text" @click="show = false">
          <v-icon color="white">mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text class="d-flex align-center justify-center" style="min-height: 400px; position: relative">
        <template v-if="images.length">
          <v-btn
            icon
            variant="text"
            size="large"
            :disabled="currentIndex <= 0"
            style="position: absolute; left: 8px; z-index: 1"
            @click="prev"
          >
            <v-icon color="white">mdi-chevron-left</v-icon>
          </v-btn>

          <img
            :src="images[currentIndex]?.data"
            style="max-width: 100%; max-height: 60vh; object-fit: contain; border-radius: 4px"
          />

          <v-btn
            icon
            variant="text"
            size="large"
            :disabled="currentIndex >= images.length - 1"
            style="position: absolute; right: 8px; z-index: 1"
            @click="next"
          >
            <v-icon color="white">mdi-chevron-right</v-icon>
          </v-btn>
        </template>
        <div v-else class="text-grey text-center">No photos</div>
      </v-card-text>

      <v-card-actions v-if="images.length">
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
import { ref, watch } from 'vue'
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

watch(() => props.modelValue, (val) => {
  show.value = val
  if (val) {
    currentIndex.value = props.startIndex ?? 0
  }
})

watch(show, (val) => {
  emit('update:modelValue', val)
})

watch(() => props.images.length, (len) => {
  if (currentIndex.value >= len) {
    currentIndex.value = Math.max(0, len - 1)
  }
})

function prev() {
  if (currentIndex.value > 0) currentIndex.value--
}

function next() {
  if (currentIndex.value < props.images.length - 1) currentIndex.value++
}

function deleteCurrent() {
  const img = props.images[currentIndex.value]
  if (img) emit('delete', img.id)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft') prev()
  else if (e.key === 'ArrowRight') next()
}
</script>
