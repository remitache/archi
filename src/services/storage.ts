import type { Project } from '../types'

const PROJECT_LIST_KEY = 'archi_project_list'
const PROJECT_PREFIX = 'archi_project_'

export function listProjects(): { id: string; name: string }[] {
  const raw = localStorage.getItem(PROJECT_LIST_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function saveProject(project: Project): void {
  localStorage.setItem(PROJECT_PREFIX + project.id, JSON.stringify(project))

  const list = listProjects()
  const idx = list.findIndex((p) => p.id === project.id)
  if (idx >= 0) {
    const entry = list[idx]!
    entry.name = project.name
    list.splice(idx, 1)
    list.unshift(entry)
  } else {
    list.unshift({ id: project.id, name: project.name })
  }
  localStorage.setItem(PROJECT_LIST_KEY, JSON.stringify(list))
}

export function loadProject(id: string): Project | null {
  const raw = localStorage.getItem(PROJECT_PREFIX + id)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function deleteProject(id: string): void {
  localStorage.removeItem(PROJECT_PREFIX + id)
  const list = listProjects().filter((p) => p.id !== id)
  localStorage.setItem(PROJECT_LIST_KEY, JSON.stringify(list))
}
