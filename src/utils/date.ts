const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseLocalDate(value: string): Date {
  const match = DATE_PATTERN.exec(value)
  if (!match) {
    throw new Error(`无效的本地日期：${value}`)
  }

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  if (formatLocalDate(date) !== value) {
    throw new Error(`无效的本地日期：${value}`)
  }
  return date
}

export function addDays(date: Date, amount: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

export function addMonths(date: Date, amount: number): Date {
  const targetMonth = new Date(date.getFullYear(), date.getMonth() + amount, 1)
  const lastDayOfTargetMonth = new Date(
    targetMonth.getFullYear(),
    targetMonth.getMonth() + 1,
    0
  ).getDate()
  targetMonth.setDate(Math.min(date.getDate(), lastDayOfTargetMonth))
  return targetMonth
}

export function getWeekDates(anchorDate: string): string[] {
  const anchor = parseLocalDate(anchorDate)
  const dayOfWeek = anchor.getDay()
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = addDays(anchor, -daysSinceMonday)

  return Array.from({ length: 7 }, (_, index) => formatLocalDate(addDays(monday, index)))
}

export interface MonthGridDay {
  value: string
  inCurrentMonth: boolean
}

export function getMonthGrid(anchorDate: string): MonthGridDay[] {
  const anchor = parseLocalDate(anchorDate)
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const dayOfWeek = firstOfMonth.getDay()
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const gridStart = addDays(firstOfMonth, -daysSinceMonday)

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index)
    return {
      value: formatLocalDate(date),
      inCurrentMonth: date.getMonth() === anchor.getMonth(),
    }
  })
}
