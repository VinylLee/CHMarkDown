export interface Todo {
  id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  dueDate: string | null
  completed: boolean
  createdAt: string
  updatedAt: string
}

export interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}
