<template>
  <v-dialog v-model="show" max-width="400" persistent>
    <v-card>
      <v-card-title>New Project</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="projectName"
          label="Project Name"
          variant="outlined"
          autofocus
          @keyup.enter="create"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="cancel">Cancel</v-btn>
        <v-btn color="primary" variant="flat" :disabled="!projectName.trim()" @click="create">
          Create
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, inject } from 'vue'
import type { Ref } from 'vue'
import { useProjectStore } from '../../stores/project'

const projectStore = useProjectStore()
const show = inject<Ref<boolean>>('showNewProject', ref(false))
const projectName = ref('')

function create() {
  if (projectName.value.trim()) {
    projectStore.newProject(projectName.value.trim())
    projectName.value = ''
    show.value = false
  }
}

function cancel() {
  projectName.value = ''
  show.value = false
}
</script>
