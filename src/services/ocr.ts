import Tesseract from 'tesseract.js'
import type { RoomLabel } from '../types'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export async function analyzePlan(imageData: string): Promise<RoomLabel[]> {
  const result = await Tesseract.recognize(imageData, 'fra+eng', {
    logger: () => {},
  })

  const labels: RoomLabel[] = []
  const seen = new Set<string>()

  const blocks = result.data.blocks
  if (!blocks) return labels

  for (const block of blocks) {
    for (const paragraph of block.paragraphs) {
      for (const line of paragraph.lines) {
        for (const word of line.words) {
          const text = word.text.trim()
          if (text.length < 3) continue
          if (/^[\d.,]+$/.test(text)) continue

          const key = text.toLowerCase()
          if (seen.has(key)) continue
          seen.add(key)

          const bbox = word.bbox
          labels.push({
            id: generateId(),
            text,
            x: bbox.x0 + (bbox.x1 - bbox.x0) / 2,
            y: bbox.y0 + (bbox.y1 - bbox.y0) / 2,
          })
        }
      }
    }
  }

  return labels
}
