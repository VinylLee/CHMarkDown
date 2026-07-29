<template>
  <section
    ref="dateStripRef"
    class="date-strip"
    aria-label="待办日期导航"
    @keydown.esc.stop="closeCalendar"
  >
    <div class="date-strip__week">
      <button type="button" class="week-arrow" aria-label="查看上一周" title="上一周" @click="shiftWeek(-1)">‹</button>

      <div class="week-days">
        <button
          v-for="day in weekDays"
          :key="day.value"
          type="button"
          class="day-button"
          :class="{
            'day-button--selected': mode === 'date' && day.value === selectedDate,
            'day-button--today': day.value === today,
          }"
          :aria-label="day.ariaLabel"
          :aria-pressed="mode === 'date' && day.value === selectedDate"
          @click="selectDate(day.value)"
        >
          <span class="day-weekday">{{ day.weekday }}</span>
          <span class="day-number">{{ day.dayNumber }}</span>
          <span v-if="day.hasOpenTodos" class="day-dot" aria-hidden="true"></span>
        </button>
      </div>

      <button type="button" class="week-arrow" aria-label="查看下一周" title="下一周" @click="shiftWeek(1)">›</button>
    </div>

    <div class="date-strip__context">
      <button
        type="button"
        class="selected-date"
        :class="{ 'selected-date--active': calendarOpen }"
        :aria-expanded="calendarOpen"
        aria-haspopup="dialog"
        @click="toggleCalendar"
      >
        <span class="selected-date__main">{{ selectedDateLabel }}</span>
        <span v-if="mode === 'date' && selectedDate === today" class="today-mark">今天</span>
        <svg class="selected-date__chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <button
        v-if="mode !== 'date' || selectedDate !== today"
        type="button"
        class="context-button"
        @click="selectDate(today)"
      >
        回到今天
      </button>
      <button
        type="button"
        class="context-button context-button--unscheduled"
        :class="{ 'context-button--active': mode === 'unscheduled' }"
        :aria-pressed="mode === 'unscheduled'"
        @click="selectUnscheduled"
      >
        未排期 <span class="unscheduled-count">{{ unscheduledCount }}</span>
      </button>
    </div>

    <Transition name="calendar-popover">
      <div
        v-if="calendarOpen"
        class="month-calendar"
        role="dialog"
        aria-modal="false"
        aria-label="选择待办日期"
      >
        <div class="month-calendar__header">
          <div class="month-calendar__nav-group">
            <button type="button" class="calendar-nav" title="上一年" aria-label="上一年" @click="shiftCalendarMonth(-12)">«</button>
            <button type="button" class="calendar-nav" title="上个月" aria-label="上个月" @click="shiftCalendarMonth(-1)">‹</button>
          </div>
          <strong class="month-calendar__title">{{ calendarTitle }}</strong>
          <div class="month-calendar__nav-group">
            <button type="button" class="calendar-nav" title="下个月" aria-label="下个月" @click="shiftCalendarMonth(1)">›</button>
            <button type="button" class="calendar-nav" title="下一年" aria-label="下一年" @click="shiftCalendarMonth(12)">»</button>
          </div>
        </div>

        <div class="month-calendar__weekdays" aria-hidden="true">
          <span v-for="weekday in calendarWeekdays" :key="weekday">{{ weekday }}</span>
        </div>

        <div class="month-calendar__grid">
          <button
            v-for="day in calendarDays"
            :key="day.value"
            type="button"
            class="calendar-day"
            :class="{
              'calendar-day--outside': !day.inCurrentMonth,
              'calendar-day--selected': mode === 'date' && day.value === selectedDate,
              'calendar-day--today': day.value === today,
            }"
            :aria-label="day.ariaLabel"
            :aria-pressed="mode === 'date' && day.value === selectedDate"
            @click="selectCalendarDate(day.value)"
          >
            <span>{{ day.dayNumber }}</span>
            <span v-if="day.hasOpenTodos" class="calendar-day__dot" aria-hidden="true"></span>
          </button>
        </div>

        <div class="month-calendar__footer">
          <span>选择日期后，清单会同步切换</span>
          <button type="button" @click="selectDate(today)">回到今天</button>
        </div>
      </div>
    </Transition>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { Todo } from '../types'
import {
  addDays,
  addMonths,
  formatLocalDate,
  getMonthGrid,
  getWeekDates,
  parseLocalDate,
} from '../utils/date'

const props = defineProps<{
  selectedDate: string
  mode: 'date' | 'unscheduled'
  todos: Todo[]
}>()

const emit = defineEmits<{
  'select-date': [date: string]
  'select-unscheduled': []
}>()

const weekdayNames = ['日', '一', '二', '三', '四', '五', '六']
const calendarWeekdays = ['一', '二', '三', '四', '五', '六', '日']
const today = formatLocalDate(new Date())
const calendarOpen = ref(false)
const calendarAnchor = ref(props.selectedDate)
const dateStripRef = ref<HTMLElement | null>(null)

const openTodoDates = computed(() => {
  return new Set(
    props.todos
      .filter((todo) => !todo.completed && todo.dueDate)
      .map((todo) => todo.dueDate as string)
  )
})

const weekDays = computed(() => {
  return getWeekDates(props.selectedDate).map((value) => {
    const date = parseLocalDate(value)
    return {
      value,
      weekday: weekdayNames[date.getDay()],
      dayNumber: date.getDate(),
      ariaLabel: `${date.getMonth() + 1}月${date.getDate()}日，星期${weekdayNames[date.getDay()]}`,
      hasOpenTodos: openTodoDates.value.has(value),
    }
  })
})

const unscheduledCount = computed(() => {
  return props.todos.filter((todo) => todo.dueDate === null).length
})

const selectedDateLabel = computed(() => {
  if (props.mode === 'unscheduled') return '未排期待办'
  const date = parseLocalDate(props.selectedDate)
  return `${date.getMonth() + 1}月${date.getDate()}日 · 周${weekdayNames[date.getDay()]}`
})

const calendarTitle = computed(() => {
  const date = parseLocalDate(calendarAnchor.value)
  return `${date.getFullYear()}年 ${date.getMonth() + 1}月`
})

const calendarDays = computed(() => {
  return getMonthGrid(calendarAnchor.value).map((day) => {
    const date = parseLocalDate(day.value)
    return {
      ...day,
      dayNumber: date.getDate(),
      ariaLabel: `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`,
      hasOpenTodos: openTodoDates.value.has(day.value),
    }
  })
})

watch(
  () => props.selectedDate,
  (selectedDate) => {
    if (!calendarOpen.value) {
      calendarAnchor.value = selectedDate
    }
  }
)

function shiftWeek(direction: -1 | 1): void {
  const shifted = addDays(parseLocalDate(props.selectedDate), direction * 7)
  selectDate(formatLocalDate(shifted))
}

function selectDate(date: string): void {
  calendarOpen.value = false
  calendarAnchor.value = date
  emit('select-date', date)
}

function selectCalendarDate(date: string): void {
  selectDate(date)
}

function selectUnscheduled(): void {
  closeCalendar()
  emit('select-unscheduled')
}

function toggleCalendar(): void {
  calendarAnchor.value = props.selectedDate
  calendarOpen.value = !calendarOpen.value
}

function closeCalendar(): void {
  calendarOpen.value = false
}

function shiftCalendarMonth(amount: number): void {
  calendarAnchor.value = formatLocalDate(addMonths(parseLocalDate(calendarAnchor.value), amount))
}

function handleDocumentPointerDown(event: PointerEvent): void {
  if (
    calendarOpen.value &&
    event.target instanceof Node &&
    !dateStripRef.value?.contains(event.target)
  ) {
    closeCalendar()
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
})
</script>

<style scoped>
.date-strip {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 14px;
  margin-bottom: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: var(--shadow-sm);
}

.date-strip__week {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.week-days {
  display: grid;
  grid-template-columns: repeat(7, 42px);
  gap: 3px;
}

.week-arrow,
.day-button,
.context-button,
.selected-date,
.calendar-nav,
.calendar-day,
.month-calendar__footer button {
  border: none;
  font: inherit;
  cursor: pointer;
}

.week-arrow {
  display: grid;
  place-items: center;
  width: 30px;
  height: 38px;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  font-family: Georgia, "Times New Roman", serif;
  font-size: 30px;
  line-height: 1;
  transition: background-color var(--transition), color var(--transition), transform 0.12s ease;
}

.week-arrow:hover {
  background: rgba(74, 158, 255, 0.09);
  color: var(--color-primary);
}

.week-arrow:active {
  transform: scale(0.92);
}

.day-button {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 48px;
  border-radius: 14px;
  background: transparent;
  color: var(--color-text-secondary);
  transition: background-color var(--transition), color var(--transition), transform 0.12s ease;
}

.day-button:hover {
  background: #eef5fd;
  color: var(--color-text);
}

.day-button:active {
  transform: translateY(1px);
}

.day-button--selected {
  background: var(--color-primary);
  color: #ffffff;
  box-shadow: 0 6px 14px rgba(74, 158, 255, 0.25);
}

.day-button--selected:hover {
  background: var(--color-primary-hover);
  color: #ffffff;
}

.day-button--today:not(.day-button--selected) .day-number {
  color: var(--color-primary);
  font-weight: 700;
}

.day-weekday {
  font-size: 9px;
  line-height: 1;
  opacity: 0.72;
}

.day-number {
  margin-top: 4px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
}

.day-dot {
  position: absolute;
  bottom: 4px;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--color-primary);
}

.day-button--selected .day-dot {
  background: #ffffff;
}

.date-strip__context {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
  padding-left: 16px;
  border-left: 1px solid var(--color-border);
}

.selected-date {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: max-content;
  padding: 7px 9px;
  border-radius: var(--radius-sm);
  background: transparent;
  transition: background-color var(--transition), box-shadow var(--transition);
}

.selected-date:hover,
.selected-date--active {
  background: #edf5ff;
}

.selected-date--active {
  box-shadow: inset 0 0 0 1px rgba(74, 158, 255, 0.2);
}

.selected-date__main {
  color: var(--color-text);
  font-size: 13px;
  font-weight: 650;
}

.today-mark {
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(74, 158, 255, 0.1);
  color: var(--color-primary);
  font-size: 10px;
  font-weight: 700;
}

.selected-date__chevron {
  color: var(--color-text-muted);
  transition: transform var(--transition);
}

.selected-date--active .selected-date__chevron {
  transform: rotate(180deg);
}

.context-button {
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-primary);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.context-button:hover {
  background: rgba(74, 158, 255, 0.09);
}

.context-button--unscheduled {
  color: var(--color-text-secondary);
}

.context-button--active {
  background: #e8f2ff;
  color: var(--color-primary);
}

.unscheduled-count {
  display: inline-grid;
  place-items: center;
  min-width: 17px;
  height: 17px;
  margin-left: 2px;
  padding: 0 4px;
  border-radius: 999px;
  background: #edf0f4;
  color: var(--color-text-secondary);
  font-size: 9px;
}

.context-button--active .unscheduled-count {
  background: var(--color-primary);
  color: #ffffff;
}

.month-calendar {
  position: absolute;
  z-index: 100;
  top: calc(100% + 8px);
  right: 0;
  width: min(390px, calc(100vw - 48px));
  padding: 14px;
  border: 1px solid #dce3eb;
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.98);
  box-shadow:
    0 24px 60px rgba(28, 40, 58, 0.18),
    0 4px 14px rgba(28, 40, 58, 0.08);
  backdrop-filter: blur(10px);
}

.month-calendar__header {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.month-calendar__nav-group {
  display: flex;
  align-items: center;
  gap: 3px;
}

.month-calendar__nav-group:last-child {
  justify-content: flex-end;
}

.calendar-nav {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  font-family: Georgia, "Times New Roman", serif;
  font-size: 20px;
  line-height: 1;
}

.calendar-nav:hover {
  background: #edf5ff;
  color: var(--color-primary);
}

.month-calendar__title {
  color: var(--color-text);
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
}

.month-calendar__weekdays,
.month-calendar__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.month-calendar__weekdays {
  margin-bottom: 4px;
  color: var(--color-text-muted);
  font-size: 10px;
  font-weight: 600;
  text-align: center;
}

.month-calendar__weekdays span {
  padding: 5px 0;
}

.month-calendar__grid {
  gap: 3px;
}

.calendar-day {
  position: relative;
  display: grid;
  place-items: center;
  min-width: 0;
  aspect-ratio: 1;
  border-radius: 11px;
  background: transparent;
  color: var(--color-text);
  font-size: 13px;
  font-weight: 550;
  transition: background-color 0.14s ease, color 0.14s ease, transform 0.12s ease;
}

.calendar-day:hover {
  background: #edf5ff;
  color: var(--color-primary);
}

.calendar-day:active {
  transform: scale(0.94);
}

.calendar-day--outside {
  color: #c5cbd3;
}

.calendar-day--today:not(.calendar-day--selected) {
  box-shadow: inset 0 0 0 1.5px rgba(74, 158, 255, 0.55);
  color: var(--color-primary);
  font-weight: 750;
}

.calendar-day--selected,
.calendar-day--selected:hover {
  background: var(--color-primary);
  color: #ffffff;
  box-shadow: 0 5px 12px rgba(74, 158, 255, 0.25);
}

.calendar-day__dot {
  position: absolute;
  bottom: 4px;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--color-primary);
}

.calendar-day--selected .calendar-day__dot {
  background: #ffffff;
}

.month-calendar__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
  padding: 10px 2px 0;
  border-top: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 10px;
}

.month-calendar__footer button {
  padding: 5px 8px;
  border-radius: var(--radius-sm);
  background: #edf5ff;
  color: var(--color-primary);
  font-size: 11px;
  font-weight: 650;
  white-space: nowrap;
}

.month-calendar__footer button:hover {
  background: #dcecff;
}

.calendar-popover-enter-active,
.calendar-popover-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
  transform-origin: top right;
}

.calendar-popover-enter-from,
.calendar-popover-leave-to {
  opacity: 0;
  transform: translateY(-5px) scale(0.985);
}

.week-arrow:focus-visible,
.day-button:focus-visible,
.context-button:focus-visible,
.selected-date:focus-visible,
.calendar-nav:focus-visible,
.calendar-day:focus-visible,
.month-calendar__footer button:focus-visible {
  outline: 2px solid rgba(74, 158, 255, 0.4);
  outline-offset: 2px;
}

@media (max-width: 980px) {
  .date-strip {
    align-items: stretch;
    flex-direction: column;
    gap: 8px;
  }

  .date-strip__week {
    justify-content: space-between;
  }

  .week-days {
    flex: 1;
    grid-template-columns: repeat(7, minmax(36px, 1fr));
  }

  .date-strip__context {
    justify-content: flex-start;
    padding: 8px 4px 0;
    border-top: 1px solid var(--color-border);
    border-left: none;
  }

  .month-calendar {
    right: 0;
    left: 0;
    width: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .week-arrow,
  .day-button,
  .calendar-popover-enter-active,
  .calendar-popover-leave-active {
    transition: none;
  }
}
</style>
