import { describe, expect, it } from 'vitest'
import { moveDocumentInOrder } from './documentOrder'

describe('moveDocumentInOrder', () => {
  const order = ['a', 'b', 'c', 'd']

  it('moves a document before the target', () => {
    expect(moveDocumentInOrder(order, 'd', 'b', 'before')).toEqual(['a', 'd', 'b', 'c'])
  })

  it('moves a document after the target', () => {
    expect(moveDocumentInOrder(order, 'a', 'c', 'after')).toEqual(['b', 'c', 'a', 'd'])
  })

  it('keeps the document in place when moving onto itself', () => {
    expect(moveDocumentInOrder(order, 'b', 'b', 'after')).toEqual(order)
    expect(moveDocumentInOrder(order, 'b', 'b', 'before')).toEqual(order)
  })

  it('returns the same array for unknown ids', () => {
    expect(moveDocumentInOrder(order, 'missing', 'b', 'before')).toEqual(order)
    expect(moveDocumentInOrder(order, 'a', 'missing', 'after')).toEqual(order)
  })

  it('handles moving to the first and last positions', () => {
    expect(moveDocumentInOrder(order, 'c', 'a', 'before')).toEqual(['c', 'a', 'b', 'd'])
    expect(moveDocumentInOrder(order, 'a', 'd', 'after')).toEqual(['b', 'c', 'd', 'a'])
  })

  it('keeps the relative order of other documents', () => {
    expect(moveDocumentInOrder(order, 'b', 'd', 'after')).toEqual(['a', 'c', 'd', 'b'])
  })
})
