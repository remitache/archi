import { InferenceClient } from '@huggingface/inference'

const STORAGE_KEY = 'archi_hf_token'
const PROVIDER_KEY = 'archi_hf_provider'
const BACKEND_MODE_KEY = 'archi_backend_mode'
const LOCAL_URL_KEY = 'archi_local_url'
const MODEL = 'black-forest-labs/FLUX.1-Kontext-dev'
const DEFAULT_LOCAL_URL = 'http://127.0.0.1:7860'

export type BackendMode = 'cloud' | 'local'

export const PROVIDERS = [
  { value: 'replicate', label: 'Replicate' },
  { value: 'wavespeed', label: 'WaveSpeed' },
  { value: 'fal-ai', label: 'Fal AI' },
] as const

export type Provider = typeof PROVIDERS[number]['value']

// --- Backend mode ---
export function getBackendMode(): BackendMode {
  return (localStorage.getItem(BACKEND_MODE_KEY) as BackendMode) || 'cloud'
}

export function setBackendMode(mode: BackendMode) {
  localStorage.setItem(BACKEND_MODE_KEY, mode)
}

// --- Local URL ---
export function getLocalUrl(): string {
  return localStorage.getItem(LOCAL_URL_KEY) || DEFAULT_LOCAL_URL
}

export function setLocalUrl(url: string) {
  localStorage.setItem(LOCAL_URL_KEY, url)
}

// --- Cloud token & provider ---
export function getHfToken(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

export function setHfToken(token: string) {
  localStorage.setItem(STORAGE_KEY, token)
}

export function getProvider(): Provider {
  return (localStorage.getItem(PROVIDER_KEY) as Provider) || 'replicate'
}

export function setProvider(provider: Provider) {
  localStorage.setItem(PROVIDER_KEY, provider)
}

function base64ToBlob(base64: string): Blob {
  // Strip data URI prefix if present
  const raw = base64.includes(',') ? base64.split(',')[1] : base64
  const bytes = atob(raw!)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) {
    arr[i] = bytes.charCodeAt(i)
  }
  return new Blob([arr], { type: 'image/jpeg' })
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function stripDataUriPrefix(base64: string): string {
  return base64.includes(',') ? base64.split(',')[1]! : base64
}

export const SYSTEM_PROMPT = 'You are an interior designer expert. I am renovating a room. Help me improve the interior design based on this criteria:'

async function generateImageEditCloud(imageBase64: string, prompt: string): Promise<string> {
  const token = getHfToken()
  if (!token) throw new Error('HuggingFace API token not configured')

  const fullPrompt = `${SYSTEM_PROMPT} ${prompt}`
  const client = new InferenceClient(token)
  const inputBlob = base64ToBlob(imageBase64)

  const resultBlob = await client.imageToImage({
    model: MODEL,
    provider: getProvider(),
    inputs: inputBlob,
    parameters: { prompt: fullPrompt },
  })

  return blobToBase64(resultBlob)
}

async function generateImageEditLocal(imageBase64: string, prompt: string): Promise<string> {
  const localUrl = getLocalUrl()
  const fullPrompt = `${SYSTEM_PROMPT} ${prompt}`
  const rawBase64 = stripDataUriPrefix(imageBase64)

  let resp: Response
  try {
    resp = await fetch(`${localUrl}/sdapi/v1/img2img`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        init_images: [rawBase64],
        prompt: fullPrompt,
        steps: 20,
        cfg_scale: 7.5,
        denoising_strength: 0.75,
      }),
    })
  } catch {
    throw new Error(
      `Cannot connect to Stable Diffusion WebUI at ${localUrl}. ` +
      'Make sure it is running with --api flag (e.g. ./webui.sh --api).'
    )
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`Local SD API error ${resp.status}: ${text || resp.statusText}`)
  }

  const result = await resp.json()
  if (!result.images?.[0]) throw new Error('No image returned from local SD API')

  return `data:image/png;base64,${result.images[0]}`
}

export async function generateImageEdit(imageBase64: string, prompt: string): Promise<string> {
  if (getBackendMode() === 'local') {
    return generateImageEditLocal(imageBase64, prompt)
  }
  return generateImageEditCloud(imageBase64, prompt)
}
