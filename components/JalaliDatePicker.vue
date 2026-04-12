<script setup>
import { toGregorian } from 'jalaali-js'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
    validator: (v) => v && 'jy' in v && 'jm' in v && 'jd' in v,
  },
  /** Hide outer title row (e.g. inside a modal that already has a heading). */
  compact: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue'])

const { todayJalali, daysInJalaliMonth, formatJalaliPersian } = useJalali()

const MONTHS_FA = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
]

/** Week starts Saturday (شنبه) — short labels, RTL order in header row. */
const WEEKDAYS_FA = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹'

function toFaDigits(str) {
  return String(str).replace(/\d/g, (d) => FA_DIGITS[Number(d)] ?? d)
}

const viewY = ref(props.modelValue.jy)
const viewM = ref(props.modelValue.jm)

watch(
  () => props.modelValue,
  (v) => {
    viewY.value = v.jy
    viewM.value = v.jm
  },
  { deep: true }
)

/** Offset of day 1 in grid (0 = first column = Saturday). */
function saturdayFirstOffset(jy, jm) {
  const g = toGregorian(jy, jm, 1)
  const dt = new Date(g.gy, g.gm - 1, g.gd)
  const jsDow = dt.getDay()
  return (jsDow + 1) % 7
}

const cells = computed(() => {
  const jy = viewY.value
  const jm = viewM.value
  const len = daysInJalaliMonth(jy, jm)
  const pad = saturdayFirstOffset(jy, jm)
  const list = []
  for (let i = 0; i < pad; i++) list.push(null)
  for (let d = 1; d <= len; d++) list.push(d)
  const tail = list.length % 7
  if (tail !== 0) {
    for (let i = 0; i < 7 - tail; i++) list.push(null)
  }
  return list
})

const monthTitle = computed(() => {
  const y = toFaDigits(viewY.value)
  return `${MONTHS_FA[viewM.value - 1]} ${y}`
})

const selectedLabel = computed(() =>
  formatJalaliPersian(props.modelValue.jy, props.modelValue.jm, props.modelValue.jd)
)

const today = computed(() => todayJalali())

function pick(day) {
  emit('update:modelValue', {
    jy: viewY.value,
    jm: viewM.value,
    jd: day,
  })
}

function prevMonth() {
  if (viewM.value <= 1) {
    viewM.value = 12
    viewY.value -= 1
  } else {
    viewM.value -= 1
  }
}

function nextMonth() {
  if (viewM.value >= 12) {
    viewM.value = 1
    viewY.value += 1
  } else {
    viewM.value += 1
  }
}

function goToday() {
  const t = todayJalali()
  viewY.value = t.jy
  viewM.value = t.jm
  emit('update:modelValue', { jy: t.jy, jm: t.jm, jd: t.jd })
}

function isSelected(day) {
  return (
    props.modelValue.jy === viewY.value &&
    props.modelValue.jm === viewM.value &&
    props.modelValue.jd === day
  )
}

function isTodayCell(day) {
  const t = today.value
  return t.jy === viewY.value && t.jm === viewM.value && t.jd === day
}
</script>

<template>
  <div :class="compact ? '' : 'rounded-box border border-base-300 bg-base-200/40 p-4'">
    <div
      v-if="!compact"
      class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="label py-0">
        <span class="label-text font-medium">تاریخ شمسی</span>
        <span class="label-text-alt badge badge-ghost badge-sm">تقویم شمسی</span>
      </div>
      <div v-if="selectedLabel" class="text-sm opacity-80" dir="rtl" lang="fa">
        انتخاب‌شده: <span class="font-semibold text-base-content">{{ selectedLabel }}</span>
      </div>
    </div>

    <div class="rounded-box border border-base-300 bg-base-100 p-3 shadow-inner">
      <div class="mb-3 flex items-center justify-between gap-2">
        <button type="button" class="btn btn-circle btn-sm btn-ghost" aria-label="ماه قبل" @click="prevMonth">
          ‹
        </button>
        <div class="min-w-0 flex-1 text-center text-base font-semibold sm:text-lg" dir="rtl">{{ monthTitle }}</div>
        <button type="button" class="btn btn-circle btn-sm btn-ghost" aria-label="ماه بعد" @click="nextMonth">
          ›
        </button>
      </div>

      <div class="mb-2 flex justify-center">
        <button type="button" class="btn btn-xs btn-outline" @click="goToday">امروز</button>
      </div>

      <div
        class="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase opacity-60 sm:text-xs"
        dir="rtl"
      >
        <span v-for="w in WEEKDAYS_FA" :key="w" class="py-1">{{ w }}</span>
      </div>

      <div class="grid grid-cols-7 gap-1">
        <template v-for="(cell, idx) in cells" :key="idx">
          <button
            v-if="cell !== null"
            type="button"
            class="btn btn-sm h-9 min-h-8 px-0 font-normal sm:h-10"
            :class="{
              'btn-primary': isSelected(cell),
              'btn-outline btn-primary/30': !isSelected(cell) && isTodayCell(cell),
              'btn-ghost': !isSelected(cell) && !isTodayCell(cell),
            }"
            @click="pick(cell)"
          >
            {{ toFaDigits(cell) }}
          </button>
          <div v-else class="h-9 sm:h-10" />
        </template>
      </div>
    </div>
  </div>
</template>
