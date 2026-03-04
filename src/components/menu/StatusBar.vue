<template>
  <div class="status-bar">
    <div class="status-left">
      <span class="status-item">
        <v-icon size="14">mdi-ruler</v-icon>
        {{ scaleText }}
      </span>
      <span class="status-sep">|</span>
      <span class="status-item">{{ projectStore.project.walls.length }} walls</span>
      <span class="status-sep">|</span>
      <span class="status-item">{{ projectStore.project.rooms.length }} rooms</span>
      <span class="status-sep">|</span>
      <span class="status-item">{{ projectStore.project.furniture.length }} furniture</span>
    </div>
    <div class="status-right">
      <button class="zoom-btn" @click="editor.show3DPreview = true" title="3D Preview">
        <v-icon size="16">mdi-rotate-3d-variant</v-icon>
      </button>
      <span class="status-sep">|</span>
      <button class="zoom-btn" @click="editor.showPlanImage = !editor.showPlanImage" :title="editor.showPlanImage ? 'Hide floor plan' : 'Show floor plan'">
        <v-icon size="16">{{ editor.showPlanImage ? 'mdi-eye' : 'mdi-eye-off' }}</v-icon>
      </button>
      <span class="status-sep">|</span>
      <button class="zoom-btn" @click="zoomOut" title="Zoom out">
        <v-icon size="16">mdi-minus</v-icon>
      </button>
      <button class="zoom-pct" @click="resetZoom" title="Reset zoom to 100%">
        {{ zoomPercent }}%
      </button>
      <button class="zoom-btn" @click="zoomIn" title="Zoom in">
        <v-icon size="16">mdi-plus</v-icon>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProjectStore } from '../../stores/project'
import { useEditorStore } from '../../stores/editor'

const projectStore = useProjectStore()
const editor = useEditorStore()

const scaleText = computed(() => {
  const s = projectStore.scale
  if (!s) return 'No scale'
  return `${s.pixelsPerCm.toFixed(1)} px/cm`
})

const zoomPercent = computed(() => Math.round(editor.zoom * 100))

function zoomIn() {
  editor.zoom = Math.min(editor.zoom + 0.05, 5)
}

function zoomOut() {
  editor.zoom = Math.max(editor.zoom - 0.05, 0.1)
}

function resetZoom() {
  editor.zoom = 1
}
</script>

<style scoped>
.status-bar {
  position: absolute;
  bottom: 12px;
  left: 12px;
  right: 12px;
  height: 36px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  z-index: 50;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  font-size: 12px;
  color: #555;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 3px;
}

.status-sep {
  color: #ccc;
}

.status-right {
  display: flex;
  align-items: center;
  gap: 2px;
}

.zoom-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: #555;
  transition: background 0.15s;
}

.zoom-btn:hover {
  background: rgba(0, 0, 0, 0.06);
}

.zoom-pct {
  min-width: 44px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  color: #333;
  transition: background 0.15s;
}

.zoom-pct:hover {
  background: rgba(0, 0, 0, 0.06);
}
</style>
