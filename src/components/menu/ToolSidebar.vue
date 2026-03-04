<template>
  <aside class="tool-sidebar">
    <div class="sidebar-logo">
      <v-icon color="white" size="28">mdi-floor-plan</v-icon>
    </div>

    <div class="sidebar-divider" />

    <button
      v-for="tool in tools"
      :key="tool.value"
      class="sidebar-btn"
      :class="{ active: editor.activeTool === tool.value }"
      @click="onToolClick(tool.value)"
    >
      <v-icon size="22" color="white">{{ tool.icon }}</v-icon>
      <span class="sidebar-label">{{ tool.label }}</span>
      <v-tooltip activator="parent" location="right">{{ tool.label }}</v-tooltip>
    </button>

    <div class="sidebar-divider" />

    <button class="sidebar-btn" @click="$emit('uploadPlan')">
      <v-icon size="22" color="white">mdi-image-plus</v-icon>
      <span class="sidebar-label">Plan</span>
      <v-tooltip activator="parent" location="right">Upload Plan</v-tooltip>
    </button>

    <button class="sidebar-btn" @click="$emit('uploadFurniture')">
      <v-icon size="22" color="white">mdi-sofa</v-icon>
      <span class="sidebar-label">Furniture</span>
      <v-tooltip activator="parent" location="right">Add Furniture</v-tooltip>
    </button>

    <button
      class="sidebar-btn"
      :class="{ active: editor.activeTool === 'addBasicFurniture' }"
      @click="onToolClick('addBasicFurniture')"
    >
      <v-icon size="22" color="white">mdi-rectangle-outline</v-icon>
      <span class="sidebar-label">Basic</span>
      <v-tooltip activator="parent" location="right">Draw Rectangle</v-tooltip>
    </button>

    <div class="sidebar-divider" />

    <button class="sidebar-btn" @click="$emit('autoDetect')">
      <v-icon size="22" color="white">mdi-auto-fix</v-icon>
      <span class="sidebar-label">Auto</span>
      <v-tooltip activator="parent" location="right">Auto Detect Walls</v-tooltip>
    </button>

    <v-spacer />
  </aside>
</template>

<script setup lang="ts">
import { useEditorStore } from '../../stores/editor'
import { useProjectStore } from '../../stores/project'
import type { Tool } from '../../types'

defineEmits<{
  uploadPlan: []
  uploadFurniture: []
  autoDetect: []
}>()

const editor = useEditorStore()
const projectStore = useProjectStore()

function onToolClick(tool: Tool) {
  if (tool === 'setScale' && projectStore.project.scaleLine) {
    editor.select(projectStore.project.scaleLine.id, 'scaleLine')
  } else {
    editor.setTool(tool)
  }
}

const tools: { value: Tool; icon: string; label: string }[] = [
  { value: 'select', icon: 'mdi-cursor-default', label: 'Select' },
  { value: 'addWall', icon: 'mdi-wall', label: 'Wall' },
  { value: 'addDoor', icon: 'mdi-door', label: 'Door' },
  { value: 'addWindow', icon: 'mdi-window-closed-variant', label: 'Window' },
  { value: 'setScale', icon: 'mdi-ruler', label: 'Scale' },
  { value: 'addRoom', icon: 'mdi-tag-text', label: 'Room' },
]
</script>

<style scoped>
.tool-sidebar {
  width: 64px;
  min-width: 64px;
  background: #2b2d42;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 4px;
  gap: 2px;
  flex-shrink: 0;
  height: 100%;
  z-index: 10;
}

.sidebar-logo {
  width: 52px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar-divider {
  width: 36px;
  height: 1px;
  background: rgba(255, 255, 255, 0.12);
  margin: 4px 0;
}

.sidebar-btn {
  width: 52px;
  height: 52px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}

.sidebar-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.sidebar-btn.active {
  background: rgba(255, 255, 255, 0.16);
}

.sidebar-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1;
  user-select: none;
}

.sidebar-btn.active .sidebar-label {
  color: #fff;
}
</style>
