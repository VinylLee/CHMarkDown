import type { Todo } from '../types'

export type TodoDateView =
  | { type: 'date'; date: string }
  | { type: 'unscheduled' }

export function filterTodosByDateView(todos: Todo[], view: TodoDateView): Todo[] {
  if (view.type === 'unscheduled') {
    return todos.filter((todo) => todo.dueDate === null)
  }

  return todos.filter((todo) => todo.dueDate === view.date)
}
