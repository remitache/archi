<template>
  <v-group>
    <v-line
      :config="{
        points: scaleLine.points,
        stroke: '#FF5722',
        strokeWidth: 2,
        dash: [10, 5],
        hitStrokeWidth: 20,
        draggable: isSelected,
      }"
      @click="onSelect"
      @dragend="onDragEnd"
    />
    <!-- Distance label at midpoint -->
    <v-text
      :config="{
        x: midX,
        y: midY - 22,
        text: labelText,
        fontSize: 13,
        fill: '#FF5722',
        offsetX: labelText.length * 3.5,
      }"
    />
    <!-- Endpoint handles when selected -->
    <template v-if="isSelected">
      <v-circle
        :config="{
          x: scaleLine.points[0],
          y: scaleLine.points[1],
          radius: 6,
          fill: '#FF5722',
          stroke: 'white',
          strokeWidth: 2,
          draggable: true,
        }"
        @dragmove="onDragHandle1"
        @dragend="onHandleDragEnd"
      />
      <v-circle
        :config="{
          x: scaleLine.points[2],
          y: scaleLine.points[3],
          radius: 6,
          fill: '#FF5722',
          stroke: 'white',
          strokeWidth: 2,
          draggable: true,
        }"
        @dragmove="onDragHandle2"
        @dragend="onHandleDragEnd"
      />
    </template>
  </v-group>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProjectStore } from '../../stores/project'
import { useEditorStore } from '../../stores/editor'
import type { ScaleLine } from '../../types'

const props = defineProps<{
  scaleLine: ScaleLine
  isSelected: boolean
}>()

const projectStore = useProjectStore()
const editor = useEditorStore()

const midX = computed(() => (props.scaleLine.points[0] + props.scaleLine.points[2]) / 2)
const midY = computed(() => (props.scaleLine.points[1] + props.scaleLine.points[3]) / 2)

const labelText = computed(() => {
  const cm = props.scaleLine.distanceCm
  if (cm >= 100) return `${(cm / 100).toFixed(2)}m`
  return `${cm.toFixed(1)}cm`
})

function onSelect() {
  if (editor.activeTool === 'select') {
    editor.select(props.scaleLine.id, 'scaleLine')
  }
}

function onDragEnd(e: any) {
  const node = e.target
  const dx = node.x()
  const dy = node.y()
  node.x(0)
  node.y(0)
  projectStore.updateScaleLine({
    points: [
      props.scaleLine.points[0] + dx,
      props.scaleLine.points[1] + dy,
      props.scaleLine.points[2] + dx,
      props.scaleLine.points[3] + dy,
    ],
  })
}

function onDragHandle1(e: any) {
  const node = e.target
  projectStore.updateScaleLine({
    points: [node.x(), node.y(), props.scaleLine.points[2], props.scaleLine.points[3]],
  })
}

function onDragHandle2(e: any) {
  const node = e.target
  projectStore.updateScaleLine({
    points: [props.scaleLine.points[0], props.scaleLine.points[1], node.x(), node.y()],
  })
}

function onHandleDragEnd() {
  projectStore.persist()
}
</script>
