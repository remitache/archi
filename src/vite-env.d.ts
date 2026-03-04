/// <reference types="vite/client" />

declare module 'vuetify/styles' {
  // vuetify styles CSS import
}

declare module 'vue-konva' {
  import { Plugin } from 'vue'
  const VueKonva: Plugin
  export default VueKonva
}
