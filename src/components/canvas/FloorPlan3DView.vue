<template>
  <v-dialog
    :model-value="editor.show3DPreview"
    fullscreen
    :scrim="false"
    transition="dialog-bottom-transition"
    @update:model-value="onClose"
  >
    <v-card class="d-flex flex-column" style="height: 100vh">
      <v-toolbar color="#2b2d42" density="compact">
        <v-btn icon @click="onClose">
          <v-icon color="white">mdi-close</v-icon>
        </v-btn>
        <v-toolbar-title class="text-white">3D Preview</v-toolbar-title>
        <v-spacer />
        <span class="text-white text-caption mr-4">
          Click to look around &middot; WASD to move &middot; Space/Shift up/down &middot; Esc to release mouse
        </span>
      </v-toolbar>

      <div ref="containerRef" class="three-container">
        <div v-if="!isPointerLocked" class="click-to-start">
          Click to enter walkthrough mode
        </div>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, onUnmounted, watch, computed, nextTick } from 'vue'
import * as THREE from 'three'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js'
import { useProjectStore } from '../../stores/project'
import { useEditorStore } from '../../stores/editor'
import type { Wall, FurnitureItem } from '../../types'

const projectStore = useProjectStore()
const editor = useEditorStore()

const containerRef = ref<HTMLElement>()
const isPointerLocked = ref(false)

// Three.js objects
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let controls: PointerLockControls | null = null
let animationFrameId = 0
let resizeObserver: ResizeObserver | null = null

// WASD fly movement
const moveState = { forward: false, backward: false, left: false, right: false, up: false, down: false }
const MOVE_SPEED = 300
const clock = new THREE.Clock()

// Heights in cm
const WALL_HEIGHT = 200
const WINDOW_SILL = 60
const WINDOW_TOP = 150
const FURNITURE_HEIGHT = 80
const CAMERA_HEIGHT = 500

const scaleFactor = computed(() => {
  const s = projectStore.scale
  return s ? 1 / s.pixelsPerCm : 1
})

function initScene() {
  if (!containerRef.value) return

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setClearColor(0xb0d4f1)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2
  containerRef.value.appendChild(renderer.domElement)

  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(75, 1, 0.1, 50000)
  camera.position.set(0, CAMERA_HEIGHT, 0)

  controls = new PointerLockControls(camera, renderer.domElement)

  containerRef.value.addEventListener('click', () => {
    controls?.lock()
  })

  controls.addEventListener('lock', () => { isPointerLocked.value = true })
  controls.addEventListener('unlock', () => { isPointerLocked.value = false })

  // Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.8))

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
  dirLight.position.set(500, 1000, 300)
  dirLight.castShadow = true
  dirLight.shadow.mapSize.set(2048, 2048)
  dirLight.shadow.camera.near = 0.5
  dirLight.shadow.camera.far = 5000
  dirLight.shadow.camera.left = -2000
  dirLight.shadow.camera.right = 2000
  dirLight.shadow.camera.top = 2000
  dirLight.shadow.camera.bottom = -2000
  scene.add(dirLight)

  const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4)
  dirLight2.position.set(-300, 800, -500)
  scene.add(dirLight2)

  scene.add(new THREE.HemisphereLight(0xaaccff, 0x886644, 0.5))

  // Floor
  const floorGeom = new THREE.PlaneGeometry(50000, 50000)
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.8, metalness: 0.0 })
  const floor = new THREE.Mesh(floorGeom, floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)

  // Skybox
  const loader = new THREE.TextureLoader()
  loader.load('/img/skybox.png', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping
    if (scene) scene.background = texture
  })

  buildScene()
  updateSize()

  clock.start()
  animate()

  resizeObserver = new ResizeObserver(updateSize)
  resizeObserver.observe(containerRef.value)

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
}

function clearDynamic() {
  if (!scene) return
  const toRemove: THREE.Object3D[] = []
  scene.traverse((obj) => {
    if (obj.userData.dynamic) toRemove.push(obj)
  })
  for (const obj of toRemove) {
    obj.removeFromParent()
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose()
      const mat = obj.material
      if (Array.isArray(mat)) mat.forEach(m => m.dispose())
      else mat.dispose()
    }
  }
}

function buildScene() {
  clearDynamic()
  const sf = scaleFactor.value

  for (const wall of projectStore.project.walls) {
    if (wall.hidden) continue
    createWall3D(wall, sf)
  }

  for (const item of projectStore.project.furniture) {
    createFurniture3D(item, sf)
  }

  positionCamera(sf)
}

function addBox(
  length: number, height: number, depth: number,
  x: number, y: number, z: number,
  angle: number, color: string | number,
  roughness = 0.7, metalness = 0.0,
  transparent = false, opacity = 1,
) {
  const geom = new THREE.BoxGeometry(length, height, depth)
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    transparent,
    opacity,
  })
  const mesh = new THREE.Mesh(geom, mat)
  mesh.position.set(x, y, z)
  mesh.rotation.y = -angle
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.userData.dynamic = true
  scene!.add(mesh)
}

function createWall3D(wall: Wall, sf: number) {
  const [x1, y1, x2, y2] = wall.points
  const sx = x1 * sf, sz = y1 * sf
  const ex = x2 * sf, ez = y2 * sf
  const dx = ex - sx, dz = ez - sz
  const length = Math.hypot(dx, dz)
  const thickness = Math.max(wall.thickness * sf, 2)
  const angle = Math.atan2(dz, dx)
  const mx = sx + dx / 2, mz = sz + dz / 2
  const type = wall.type ?? 'wall'
  // Walls always light grey in 3D; doors/windows keep their 2D color
  const color = type === 'wall' ? '#CCCCCC' : wall.color

  if (type === 'wall') {
    addBox(length, WALL_HEIGHT, thickness, mx, WALL_HEIGHT / 2, mz, angle, color, 0.9, 0.0)
  } else if (type === 'door') {
    // Full height door — 40% transparent
    addBox(length, WALL_HEIGHT, thickness, mx, WALL_HEIGHT / 2, mz, angle, color, 0.6, 0.0, true, 0.4)
  } else if (type === 'window') {
    // Bottom sill
    addBox(length, WINDOW_SILL, thickness, mx, WINDOW_SILL / 2, mz, angle, color, 0.8, 0.0)
    // Glass pane (semi-transparent, slightly reflective)
    const glassH = WINDOW_TOP - WINDOW_SILL
    addBox(length, glassH, thickness * 0.3, mx, WINDOW_SILL + glassH / 2, mz, angle, 0x88ccff, 0.1, 0.3, true, 0.35)
    // Top wall
    const topH = WALL_HEIGHT - WINDOW_TOP
    addBox(length, topH, thickness, mx, WINDOW_TOP + topH / 2, mz, angle, color, 0.8, 0.0)
  }
}

function createFurniture3D(item: FurnitureItem, sf: number) {
  const isBasic = !item.imageData && item.width != null && item.height != null
  if (!isBasic) return

  const sw = (item.width ?? 50) * Math.abs(item.scaleX)
  const sh = (item.height ?? 50) * Math.abs(item.scaleY)
  const angle = item.rotation * (Math.PI / 180)

  // Konva rotates around (item.x, item.y) — the top-left corner.
  // Compute the rotated center position in 2D world space.
  const localCx = sw / 2
  const localCy = sh / 2
  const cx = (item.x + localCx * Math.cos(angle) - localCy * Math.sin(angle)) * sf
  const cz = (item.y + localCx * Math.sin(angle) + localCy * Math.cos(angle)) * sf

  const color = item.fillColor ?? '#90CAF9'

  addBox(sw * sf, FURNITURE_HEIGHT, sh * sf, cx, FURNITURE_HEIGHT / 2, cz, angle, color, 0.5, 0.1)
}

function positionCamera(sf: number) {
  if (!camera) return
  const walls = projectStore.project.walls.filter(w => !w.hidden)
  if (walls.length === 0) {
    camera.position.set(0, CAMERA_HEIGHT, 0)
    camera.lookAt(0, 0, 0)
    return
  }
  let sx = 0, sz = 0, n = 0
  for (const w of walls) {
    sx += (w.points[0] + w.points[2]) / 2
    sz += (w.points[1] + w.points[3]) / 2
    n++
  }
  const cx = (sx / n) * sf
  const cz = (sz / n) * sf
  // Start at 5m height, looking down at the center of the plan
  camera.position.set(cx, CAMERA_HEIGHT, cz + 50)
  camera.lookAt(cx, 0, cz)
}

function updateSize() {
  if (!containerRef.value || !renderer || !camera) return
  const w = containerRef.value.clientWidth
  const h = containerRef.value.clientHeight
  renderer.setSize(w, h)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}

function animate() {
  animationFrameId = requestAnimationFrame(animate)
  if (!controls || !camera || !renderer || !scene) return

  const delta = clock.getDelta()

  if (controls.isLocked) {
    const v = MOVE_SPEED * delta
    const forward = new THREE.Vector3()
    camera.getWorldDirection(forward)
    const right = new THREE.Vector3()
    right.crossVectors(forward, camera.up).normalize()
    const up = new THREE.Vector3(0, 1, 0)

    const move = new THREE.Vector3()
    if (moveState.forward) move.add(forward)
    if (moveState.backward) move.sub(forward)
    if (moveState.right) move.add(right)
    if (moveState.left) move.sub(right)
    if (moveState.up) move.add(up)
    if (moveState.down) move.sub(up)
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(v)
      camera.position.add(move)
    }
  }
  renderer.render(scene, camera)
}

function onKeyDown(e: KeyboardEvent) {
  switch (e.code) {
    case 'KeyW': case 'ArrowUp': moveState.forward = true; break
    case 'KeyS': case 'ArrowDown': moveState.backward = true; break
    case 'KeyA': case 'ArrowLeft': moveState.left = true; break
    case 'KeyD': case 'ArrowRight': moveState.right = true; break
    case 'Space': moveState.up = true; e.preventDefault(); break
    case 'ShiftLeft': case 'ShiftRight': moveState.down = true; break
  }
}

function onKeyUp(e: KeyboardEvent) {
  switch (e.code) {
    case 'KeyW': case 'ArrowUp': moveState.forward = false; break
    case 'KeyS': case 'ArrowDown': moveState.backward = false; break
    case 'KeyA': case 'ArrowLeft': moveState.left = false; break
    case 'KeyD': case 'ArrowRight': moveState.right = false; break
    case 'Space': moveState.up = false; break
    case 'ShiftLeft': case 'ShiftRight': moveState.down = false; break
  }
}

function cleanup() {
  cancelAnimationFrame(animationFrameId)
  resizeObserver?.disconnect()
  resizeObserver = null
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  controls?.dispose()
  controls = null
  renderer?.dispose()
  if (renderer?.domElement?.parentElement) {
    renderer.domElement.parentElement.removeChild(renderer.domElement)
  }
  renderer = null
  scene = null
  camera = null
  moveState.forward = moveState.backward = moveState.left = moveState.right = moveState.up = moveState.down = false
}

function onClose() {
  cleanup()
  editor.show3DPreview = false
}

// Initialize when dialog opens
watch(() => editor.show3DPreview, async (open) => {
  if (open) {
    await nextTick()
    await nextTick()
    initScene()
  }
})

onUnmounted(() => {
  cleanup()
})
</script>

<style scoped>
.three-container {
  flex: 1;
  position: relative;
  background: #e0e0e0;
  overflow: hidden;
}

.click-to-start {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 16px 32px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 8px;
  font-size: 16px;
  pointer-events: none;
  z-index: 10;
}
</style>
