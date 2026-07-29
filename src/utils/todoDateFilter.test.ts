import { describe, expect, it } from 'vitest'
import type { Todo } from '../types'
import { filterTodosByDateView } from './todoDateFilter'

function todo(id: string, dueDate: string | null): Todo {
  return {
    id,
    title: id,
    description: '',
    priority: 'medium',
    dueDate,
    completed: false,
    createdAt: '2026-07-22T00:00:00.000Z',
    updatedAt: '2026-07-22T00:00:00.000Z',
  }
}

describe('filterTodosByDateView', () => {
  const todos = [
    todo('today', '2026-07-22'),
    todo('tomorrow', '2026-07-23'),
    todo('unscheduled', null),
  ]

  it('shows only todos assigned to the selected day', () => {
    expect(filterTodosByDateView(todos, { type: 'date', date: '2026-07-22' }))
      .toEqual([todos[0]])
  })

  it('keeps existing todos without a date accessible', () => {
    expect(filterTodosByDateView(todos, { type: 'unscheduled' }))
      .toEqual([todos[2]])
  })
})
