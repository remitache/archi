import type { Project } from '../types'

export function exportProject(project: Project): void {
  const json = JSON.stringify(project, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importProject(file: File): Promise<Project> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as Project
        if (!data.id || !data.name || !Array.isArray(data.walls)) {
          reject(new Error('Invalid project file'))
          return
        }
        resolve(data)
      } catch {
        reject(new Error('Failed to parse project file'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
