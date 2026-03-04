<template>
  <v-app>
    <AppToolbar @export="handleExport" @import="handleImport" />
    <v-main class="d-flex" style="height: calc(100vh - 48px)">
      <ToolSidebar @upload-plan="uploadPlan" @upload-furniture="uploadFurniture" @auto-detect="handleAutoDetect" />
      <div class="canvas-area">
        <FloorPlanCanvas />
        <v-progress-linear
          v-if="editor.isOcrRunning"
          indeterminate
          color="primary"
          class="position-absolute"
          style="top: 0; left: 0; right: 0; z-index: 10"
        />
        <StatusBar />
      </div>
    </v-main>
    <ControlPanel />
    <NewProjectDialog />
    <FloorPlan3DView />

    <input ref="planInput" type="file" accept="image/*" hidden @change="onPlanSelected" />
    <input ref="furnitureInput" type="file" accept="image/*" hidden @change="onFurnitureSelected" />
    <input ref="importInput" type="file" accept=".json" hidden @change="onImportSelected" />
  </v-app>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AppToolbar from './components/menu/AppToolbar.vue'
import ToolSidebar from './components/menu/ToolSidebar.vue'
import StatusBar from './components/menu/StatusBar.vue'
import FloorPlanCanvas from './components/canvas/FloorPlanCanvas.vue'
import ControlPanel from './components/panels/ControlPanel.vue'
import NewProjectDialog from './components/dialogs/NewProjectDialog.vue'
import FloorPlan3DView from './components/canvas/FloorPlan3DView.vue'
import { useEditorStore } from './stores/editor'
import { useProjectStore } from './stores/project'
import { analyzePlan } from './services/ocr'
import { exportProject, importProject } from './services/fileIO'
import { detectWalls } from './services/wallDetection'

const editor = useEditorStore()
const projectStore = useProjectStore()

const planInput = ref<HTMLInputElement>()
const furnitureInput = ref<HTMLInputElement>()
const importInput = ref<HTMLInputElement>()

function uploadPlan() {
  planInput.value?.click()
}

async function onPlanSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async () => {
    const base64 = reader.result as string
    projectStore.setPlanImage(base64)

    editor.isOcrRunning = true
    try {
      const labels = await analyzePlan(base64)
      for (const label of labels) {
        projectStore.addRoom(label.text, label.x, label.y)
      }
    } catch (err) {
      console.error('OCR failed:', err)
    } finally {
      editor.isOcrRunning = false
    }
  }
  reader.readAsDataURL(file)
  ;(e.target as HTMLInputElement).value = ''
}

function uploadFurniture() {
  furnitureInput.value?.click()
}

function onFurnitureSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    const base64 = reader.result as string
    const name = file.name.replace(/\.[^.]+$/, '')
    const item = projectStore.addFurniture(name, base64, 100, 100)
    editor.select(item.id, 'furniture')
  }
  reader.readAsDataURL(file)
  ;(e.target as HTMLInputElement).value = ''
}

async function handleAutoDetect() {
  const planImage = projectStore.project.planImage
  if (!planImage) {
    console.warn('No plan image to detect walls from')
    return
  }

  editor.isOcrRunning = true
  try {
    const lines = await detectWalls(planImage)
    for (const line of lines) {
      projectStore.addWall(line.x1, line.y1, line.x2, line.y2)
    }
  } catch (err) {
    console.error('Wall detection failed:', err)
  } finally {
    editor.isOcrRunning = false
  }
}

function handleExport() {
  exportProject(projectStore.project)
}

function handleImport() {
  importInput.value?.click()
}

async function onImportSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    const data = await importProject(file)
    projectStore.importProject(data)
  } catch (err) {
    console.error('Import failed:', err)
  }
  ;(e.target as HTMLInputElement).value = ''
}
</script>

<style scoped>
.canvas-area {
  flex: 1;
  position: relative;
  overflow: hidden;
}
</style>
