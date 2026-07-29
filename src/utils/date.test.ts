import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  formatLocalDate,
  getMonthGrid,
  getWeekDates,
  parseLocalDate,
} from './date'

describe('date utilities', () => {
  it('formats a date with local calendar fields', () => {
    expect(formatLocalDate(new Date(2026, 6, 22, 23, 30))).toBe('2026-07-22')
  })

  it('parses a date without applying a UTC offset', () => {
    const date = parseLocalDate('2026-07-22')
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 6, 22])
  })

  it('returns the natural Monday-to-Sunday week', () => {
    expect(getWeekDates('2026-07-22')).toEqual([
      '2026-07-20',
      '2026-07-21',
      '2026-07-22',
      '2026-07-23',
      '2026-07-24',
      '2026-07-25',
      '2026-07-26',
    ])
  })

  it('moves safely across month and year boundaries', () => {
    expect(formatLocalDate(addDays(parseLocalDate('2026-12-31'), 1))).toBe('2027-01-01')
    expect(getWeekDates('2027-01-01')[0]).toBe('2026-12-28')
  })

  it('moves between months while clamping invalid month-end dates', () => {
    expect(formatLocalDate(addMonths(parseLocalDate('2026-01-31'), 1))).toBe('2026-02-28')
    expect(formatLocalDate(addMonths(parseLocalDate('2026-12-22'), 1))).toBe('2027-01-22')
  })

  it('builds a stable six-week Monday-first month grid', () => {
    const grid = getMonthGrid('2026-07-22')

    expect(grid).toHaveLength(42)
    expect(grid[0]).toEqual({ value: '2026-06-29', inCurrentMonth: false })
    expect(grid[2]).toEqual({ value: '2026-07-01', inCurrentMonth: true })
    expect(grid[41]).toEqual({ value: '2026-08-09', inCurrentMonth: false })
  })
})
