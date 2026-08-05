import { describe, expect, it } from 'vitest'
import { resolveCloseRangeTargets } from './documentCloseRange'

describe('resolveCloseRangeTargets', () => {
  const order = ['a', 'b', 'c', 'd']

  it('returns documents above the target', () => {
    expect(resolveCloseRangeTargets(order, 'above', 'c')).toEqual(['a', 'b'])
  })

  it('returns documents below the target', () => {
    expect(resolveCloseRangeTargets(order, 'below', 'b')).toEqual(['c', 'd'])
  })

  it('returns all documents except the target for others', () => {
    expect(resolveCloseRangeTargets(order, 'others', 'b')).toEqual(['a', 'c', 'd'])
  })

  it('returns empty arrays at the edges', () => {
    expect(resolveCloseRangeTargets(order, 'above', 'a')).toEqual([])
    expect(resolveCloseRangeTargets(order, 'below', 'd')).toEqual([])
    expect(resolveCloseRangeTargets(order, 'others', 'a')).toEqual(['b', 'c', 'd'])
  })

  it('returns an empty array for an unknown target', () => {
    expect(resolveCloseRangeTargets(order, 'above', 'missing')).toEqual([])
    expect(resolveCloseRangeTargets(order, 'others', 'missing')).toEqual([])
  })
})
