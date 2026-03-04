<template>
  <v-app-bar color="surface" density="compact" elevation="1" :height="48">
    <!-- File menu -->
    <v-menu>
      <template #activator="{ props }">
        <v-btn v-bind="props" class="ml-2 text-none" size="small">
          File
        </v-btn>
      </template>
      <v-list density="compact">
        <v-list-item prepend-icon="mdi-plus" title="New Project" @click="showNewProject = true" />
        <v-divider />
        <v-list-item prepend-icon="mdi-upload" title="Import JSON" @click="$emit('import')" />
        <v-list-item prepend-icon="mdi-download" title="Export JSON" @click="$emit('export')" />
      </v-list>
    </v-menu>

    <!-- Editable project name -->
    <div class="d-flex align-center mx-2">
      <v-icon size="16" class="mr-1">mdi-folder-open</v-icon>
      <input
        v-if="isEditingName"
        ref="nameInputRef"
        v-model="editingName"
        class="project-name-input"
        @keydown.enter="saveName"
        @blur="saveName"
      />
      <span
        v-else
        class="project-name-text"
        @click="startEditName"
      >{{ projectStore.project.name }}</span>
    </div>

    <!-- Project selector -->
    <v-menu v-if="projectStore.projectList.length > 1">
      <template #activator="{ props }">
        <v-btn v-bind="props" icon size="x-small" variant="text">
          <v-icon size="16">mdi-chevron-down</v-icon>
        </v-btn>
      </template>
      <v-list density="compact">
        <v-list-item
          v-for="p in projectStore.projectList"
          :key="p.id"
          :title="p.name"
          :active="p.id === projectStore.project.id"
          @click="projectStore.openProject(p.id)"
        />
      </v-list>
    </v-menu>

    <v-divider vertical class="mx-1" />

    <!-- Active tool indicator -->
    <div class="d-flex align-center text-caption text-medium-emphasis px-2">
      <v-icon size="16" class="mr-1">{{ activeToolIcon }}</v-icon>
      {{ activeToolLabel }}
    </div>

    <!-- Selected element info -->
    <template v-if="editor.selectedId">
      <v-divider vertical class="mx-1" />
      <div class="d-flex align-center text-caption text-medium-emphasis px-2">
        <v-icon size="14" class="mr-1">{{ selectedTypeIcon }}</v-icon>
        {{ selectedTypeLabel }}
      </div>
      <v-btn icon size="x-small" @click="deleteSelected">
        <v-icon size="16" color="error">mdi-delete</v-icon>
        <v-tooltip activator="parent" location="bottom">Delete</v-tooltip>
      </v-btn>
    </template>

    <v-spacer />
  </v-app-bar>
</template>

<script setup lang="ts">
import { ref, computed, provide, nextTick } from 'vue'
import { useProjectStore } from '../../stores/project'
import { useEditorStore } from '../../stores/editor'

defineEmits<{
  export: []
  import: []
}>()

const projectStore = useProjectStore()
const editor = useEditorStore()

const showNewProject = ref(false)
provide('showNewProject', showNewProject)

const isEditingName = ref(false)
const editingName = ref('')
const nameInputRef = ref<HTMLInputElement>()

function startEditName() {
  editingName.value = projectStore.project.name
  isEditingName.value = true
  nextTick(() => {
    nameInputRef.value?.select()
  })
}

function saveName() {
  const trimmed = editingName.value.trim()
  if (trimmed && trimmed !== projectStore.project.name) {
    projectStore.project.name = trimmed
    projectStore.persist()
  }
  isEditingName.value = false
}

const toolMeta: Record<string, { icon: string; label: string }> = {
  select: { icon: 'mdi-cursor-default', label: 'Select' },
  addWall: { icon: 'mdi-wall', label: 'Wall Tool' },
  addDoor: { icon: 'mdi-door', label: 'Door Tool' },
  addWindow: { icon: 'mdi-window-closed-variant', label: 'Window Tool' },
  setScale: { icon: 'mdi-ruler', label: 'Scale Tool' },
  addRoom: { icon: 'mdi-tag-text', label: 'Room Tool' },
  addBasicFurniture: { icon: 'mdi-rectangle-outline', label: 'Rectangle Tool' },
  pickWallForRoom: { icon: 'mdi-wall', label: 'Pick Wall' },
}

const activeToolIcon = computed(() => toolMeta[editor.activeTool]?.icon ?? 'mdi-cursor-default')
const activeToolLabel = computed(() => toolMeta[editor.activeTool]?.label ?? 'Select')

const selectedTypeIcon = computed(() => {
  switch (editor.selectedType) {
    case 'wall': return 'mdi-wall'
    case 'door': return 'mdi-door'
    case 'window': return 'mdi-window-closed-variant'
    case 'room': return 'mdi-tag-text'
    case 'furniture': return 'mdi-sofa'
    case 'scaleLine': return 'mdi-ruler'
    default: return 'mdi-select'
  }
})

const selectedTypeLabel = computed(() => {
  switch (editor.selectedType) {
    case 'wall': return 'Wall selected'
    case 'door': return 'Door selected'
    case 'window': return 'Window selected'
    case 'room': return 'Room selected'
    case 'furniture': return 'Furniture selected'
    case 'scaleLine': return 'Scale selected'
    default: return ''
  }
})

function deleteSelected() {
  if (!editor.selectedId || !editor.selectedType) return
  const id = editor.selectedId
  const type = editor.selectedType
  editor.clearSelection()
  switch (type) {
    case 'wall': case 'door': case 'window': projectStore.deleteWall(id); break
    case 'room': projectStore.deleteRoom(id); break
    case 'furniture': projectStore.deleteFurniture(id); break
    case 'scaleLine': projectStore.deleteScaleLine(); break
  }
}
</script>

<style scoped>
.project-name-text {
  font-size: 14px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
}
.project-name-text:hover {
  background: rgba(0, 0, 0, 0.06);
}
.project-name-input {
  font-size: 14px;
  border: 1px solid #1976D2;
  border-radius: 4px;
  padding: 2px 4px;
  outline: none;
  width: 160px;
}
</style>
