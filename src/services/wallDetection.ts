/**
 * Client-side wall detection from plan images.
 * Uses canvas-based edge detection: grayscale → Sobel → threshold → line segment detection.
 */

interface DetectedLine {
  x1: number
  y1: number
  x2: number
  y2: number
}

/**
 * Detect wall-like lines from a base64-encoded plan image.
 * Returns line segments in image coordinates.
 */
export async function detectWalls(imageBase64: string): Promise<DetectedLine[]> {
  const img = await loadImage(imageBase64)
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const w = canvas.width
  const h = canvas.height

  // Step 1: Grayscale
  const gray = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const r = imageData.data[i * 4]!
    const g = imageData.data[i * 4 + 1]!
    const b = imageData.data[i * 4 + 2]!
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b
  }

  // Step 2: Sobel edge detection
  const edges = new Float32Array(w * h)
  const angles = new Float32Array(w * h)

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x
      const gx =
        -gray[(y - 1) * w + (x - 1)]! - 2 * gray[y * w + (x - 1)]! - gray[(y + 1) * w + (x - 1)]! +
        gray[(y - 1) * w + (x + 1)]! + 2 * gray[y * w + (x + 1)]! + gray[(y + 1) * w + (x + 1)]!
      const gy =
        -gray[(y - 1) * w + (x - 1)]! - 2 * gray[(y - 1) * w + x]! - gray[(y - 1) * w + (x + 1)]! +
        gray[(y + 1) * w + (x - 1)]! + 2 * gray[(y + 1) * w + x]! + gray[(y + 1) * w + (x + 1)]!
      edges[idx] = Math.sqrt(gx * gx + gy * gy)
      angles[idx] = Math.atan2(gy, gx)
    }
  }

  // Step 3: Threshold to binary
  // Use Otsu-like approach: compute mean and use 1.5x mean as threshold
  let sum = 0
  let count = 0
  for (let i = 0; i < edges.length; i++) {
    if (edges[i]! > 0) {
      sum += edges[i]!
      count++
    }
  }
  const mean = count > 0 ? sum / count : 128
  const threshold = mean * 1.5

  const binary = new Uint8Array(w * h)
  for (let i = 0; i < edges.length; i++) {
    binary[i] = edges[i]! > threshold ? 1 : 0
  }

  // Step 4: Detect horizontal and vertical line segments using run-length encoding
  const lines: DetectedLine[] = []
  const minLength = Math.max(20, Math.min(w, h) * 0.03) // Minimum 3% of image or 20px

  // Horizontal runs
  for (let y = 0; y < h; y++) {
    let runStart = -1
    for (let x = 0; x <= w; x++) {
      const val = x < w ? binary[y * w + x]! : 0
      if (val === 1 && runStart === -1) {
        runStart = x
      } else if (val === 0 && runStart !== -1) {
        const length = x - runStart
        if (length >= minLength) {
          lines.push({ x1: runStart, y1: y, x2: x, y2: y })
        }
        runStart = -1
      }
    }
  }

  // Vertical runs
  for (let x = 0; x < w; x++) {
    let runStart = -1
    for (let y = 0; y <= h; y++) {
      const val = y < h ? binary[y * w + x]! : 0
      if (val === 1 && runStart === -1) {
        runStart = y
      } else if (val === 0 && runStart !== -1) {
        const length = y - runStart
        if (length >= minLength) {
          lines.push({ x1: x, y1: runStart, x2: x, y2: y })
        }
        runStart = -1
      }
    }
  }

  // Step 5: Merge collinear nearby segments
  const merged = mergeLines(lines, minLength * 0.5)

  // Step 6: Filter out very short results
  return merged.filter(l => {
    const len = Math.hypot(l.x2 - l.x1, l.y2 - l.y1)
    return len >= minLength
  })
}

function mergeLines(lines: DetectedLine[], tolerance: number): DetectedLine[] {
  if (lines.length === 0) return []

  const used = new Array(lines.length).fill(false)
  const result: DetectedLine[] = []

  for (let i = 0; i < lines.length; i++) {
    if (used[i]) continue
    let line = { ...lines[i]! }
    used[i] = true

    let merged = true
    while (merged) {
      merged = false
      for (let j = i + 1; j < lines.length; j++) {
        if (used[j]) continue
        const other = lines[j]!

        const isHoriz1 = Math.abs(line.y1 - line.y2) < tolerance
        const isHoriz2 = Math.abs(other.y1 - other.y2) < tolerance
        const isVert1 = Math.abs(line.x1 - line.x2) < tolerance
        const isVert2 = Math.abs(other.x1 - other.x2) < tolerance

        if (isHoriz1 && isHoriz2 && Math.abs(line.y1 - other.y1) < tolerance) {
          // Same horizontal band - check overlap/proximity
          const minX = Math.min(line.x1, line.x2, other.x1, other.x2)
          const maxX = Math.max(line.x1, line.x2, other.x1, other.x2)
          const lineLen = Math.abs(line.x2 - line.x1) + Math.abs(other.x2 - other.x1)
          if (maxX - minX <= lineLen + tolerance) {
            line = { x1: minX, y1: (line.y1 + other.y1) / 2, x2: maxX, y2: (line.y2 + other.y2) / 2 }
            used[j] = true
            merged = true
          }
        } else if (isVert1 && isVert2 && Math.abs(line.x1 - other.x1) < tolerance) {
          const minY = Math.min(line.y1, line.y2, other.y1, other.y2)
          const maxY = Math.max(line.y1, line.y2, other.y1, other.y2)
          const lineLen = Math.abs(line.y2 - line.y1) + Math.abs(other.y2 - other.y1)
          if (maxY - minY <= lineLen + tolerance) {
            line = { x1: (line.x1 + other.x1) / 2, y1: minY, x2: (line.x2 + other.x2) / 2, y2: maxY }
            used[j] = true
            merged = true
          }
        }
      }
    }

    result.push(line)
  }

  return result
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
