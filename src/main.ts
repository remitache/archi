import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import VueKonva from 'vue-konva'
import 'vuetify/styles'
import App from './App.vue'

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  theme: {
    defaultTheme: 'archiLight',
    themes: {
      archiLight: {
        dark: false,
        colors: {
          background: '#f0f0f0',
          surface: '#ffffff',
          'surface-variant': '#2b2d42',
          primary: '#1976d2',
          secondary: '#424242',
          error: '#d32f2f',
        },
      },
    },
  },
  defaults: {
    VBtn: { variant: 'text' },
    VTextField: { variant: 'outlined', density: 'compact' },
  },
})

const pinia = createPinia()

const app = createApp(App)
app.use(pinia)
app.use(vuetify)
app.use(VueKonva)
app.mount('#app')
