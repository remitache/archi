<template>
  <v-navigation-drawer
    permanent
    location="right"
    :width="280"
    :scrim="false"
  >
    <div class="d-flex align-center pa-3">
      <v-icon class="mr-2" size="18">mdi-cog</v-icon>
      <span class="text-subtitle-2">Properties</span>
    </div>
    <v-divider />

    <div class="panel-scroll" style="overflow-y: auto; height: calc(100% - 49px)">
      <WallProperties
        v-if="(editor.selectedType === 'wall' || editor.selectedType === 'door' || editor.selectedType === 'window') && selectedWall"
        :key="selectedWall.id"
        :wall="selectedWall"
      />
      <RoomProperties
        v-if="editor.selectedType === 'room' && selectedRoom"
        :room="selectedRoom"
      />
      <FurnitureProperties
        v-if="editor.selectedType === 'furniture' && selectedFurniture"
        :item="selectedFurniture"
      />
      <ScaleLineProperties
        v-if="editor.selectedType === 'scaleLine' && selectedScaleLine"
        :scale-line="selectedScaleLine"
      />
      <div v-if="!editor.selectedId" class="pa-4 text-caption text-medium-emphasis">
        Select an element to see its properties.
      </div>
    </div>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProjectStore } from '../../stores/project'
import { useEditorStore } from '../../stores/editor'
import WallProperties from './WallProperties.vue'
import RoomProperties from './RoomProperties.vue'
import FurnitureProperties from './FurnitureProperties.vue'
import ScaleLineProperties from './ScaleLineProperties.vue'

const projectStore = useProjectStore()
const editor = useEditorStore()

const selectedWall = computed(() =>
  projectStore.project.walls.find((w) => w.id === editor.selectedId)
)
const selectedRoom = computed(() =>
  projectStore.project.rooms.find((r) => r.id === editor.selectedId)
)
const selectedFurniture = computed(() =>
  projectStore.project.furniture.find((f) => f.id === editor.selectedId)
)
const selectedScaleLine = computed(() => {
  const sl = projectStore.project.scaleLine
  return sl && sl.id === editor.selectedId ? sl : null
})
</script>
