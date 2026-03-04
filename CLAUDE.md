# Archi - House Renovation Planner

## Tech Stack
- Vue 3 + TypeScript + Vite
- Konva.js (vue-konva) for interactive canvas
- Vuetify 3 for UI components
- Pinia for state management
- Tesseract.js for client-side OCR
- localStorage + JSON file export/import for persistence

## Commands
- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Conventions
- Use Vue 3 Composition API with `<script setup lang="ts">`
- Store files in `src/stores/` using Pinia `defineStore` with setup syntax
- Types in `src/types/index.ts`
- Services (OCR, storage, file I/O) in `src/services/`
- Canvas components in `src/components/canvas/`
- Property panels in `src/components/panels/`
- All state flows through Pinia stores; no direct component-to-component mutation
