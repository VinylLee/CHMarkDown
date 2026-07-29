import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

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

export type CreateTodoInput = Pick<Todo, 'title' | 'description' | 'priority' | 'dueDate'>

function getDataPath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, 'todos.json')
}

function readTodos(): Todo[] {
  const filePath = getDataPath()
  try {
    if (!fs.existsSync(filePath)) {
      return []
    }
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw) as Todo[]
  } catch (err) {
    console.error('Failed to read todos.json:', err)
    return []
  }
}

function writeTodos(todos: Todo[]): void {
  const filePath = getDataPath()
  try {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(filePath, JSON.stringify(todos, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to write todos.json:', err)
    throw new Error('保存待办事项失败')
  }
}

export function getAllTodos(): Todo[] {
  return readTodos()
}

export function addTodo(input: CreateTodoInput): Todo {
  const todos = readTodos()
  const now = new Date().toISOString()
  const todo: Todo = {
    id: crypto.randomUUID(),
    title: input.title,
    description: input.description || '',
    priority: input.priority || 'medium',
    dueDate: input.dueDate || null,
    completed: false,
    createdAt: now,
    updatedAt: now,
  }
  todos.push(todo)
  writeTodos(todos)
  return todo
}

export function updateTodo(id: string, updates: Partial<CreateTodoInput & { completed: boolean }>): Todo {
  const todos = readTodos()
  const index = todos.findIndex((t) => t.id === id)
  if (index === -1) {
    throw new Error('待办事项不存在')
  }
  const todo = todos[index]
  const updated: Todo = {
    ...todo,
    ...updates,
    id: todo.id,
    createdAt: todo.createdAt,
    updatedAt: new Date().toISOString(),
  }
  todos[index] = updated
  writeTodos(todos)
  return updated
}

export function deleteTodo(id: string): void {
  const todos = readTodos()
  const filtered = todos.filter((t) => t.id !== id)
  if (filtered.length === todos.length) {
    throw new Error('待办事项不存在')
  }
  writeTodos(filtered)
}
