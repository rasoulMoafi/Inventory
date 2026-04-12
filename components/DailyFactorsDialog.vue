<script setup>
import {
  collectBuyLotsInRange,
  collectSalesInRange,
  sumBuyLotsTotal,
  sumSellProfitForDay,
} from '~/composables/useDailyFactorsReport'

const { materials } = useMaterials()
const { customers } = useCustomers()
const { todayJalali, formatJalaliPersian, daysInJalaliMonth, isJalaliDateValid } = useJalali()
const { formatRial } = useRialInput()

const mainDialogRef = ref(null)
const singleDateDialogRef = ref(null)
const datePickTarget = ref(null)

const t0 = todayJalali()
const buyFrom = reactive({ jy: t0.jy, jm: t0.jm, jd: t0.jd })
const buyTo = reactive({ jy: t0.jy, jm: t0.jm, jd: t0.jd })
const sellFrom = reactive({ jy: t0.jy, jm: t0.jm, jd: t0.jd })
const sellTo = reactive({ jy: t0.jy, jm: t0.jm, jd: t0.jd })

const pickDraft = reactive({ jy: t0.jy, jm: t0.jm, jd: t0.jd })

function clampDay(o) {
  const max = daysInJalaliMonth(o.jy, o.jm)
  if (o.jd > max) o.jd = max
  if (o.jd < 1) o.jd = 1
}

watch(() => [buyFrom.jy, buyFrom.jm], () => clampDay(buyFrom))
watch(() => [buyTo.jy, buyTo.jm], () => clampDay(buyTo))
watch(() => [sellFrom.jy, sellFrom.jm], () => clampDay(sellFrom))
watch(() => [sellTo.jy, sellTo.jm], () => clampDay(sellTo))

watch(
  () => [pickDraft.jy, pickDraft.jm],
  () => clampDay(pickDraft)
)

const buyRows = computed(() =>
  collectBuyLotsInRange(materials.value, buyFrom, buyTo)
)

const sellRows = computed(() =>
  collectSalesInRange(customers.value, sellFrom, sellTo)
)

const buyRangeTotal = computed(() => sumBuyLotsTotal(buyRows.value))
const sellRangeProfitTotal = computed(() => sumSellProfitForDay(sellRows.value))

function formatRangeLabel(from, to) {
  if (!isJalaliDateValid(from.jy, from.jm, from.jd) || !isJalaliDateValid(to.jy, to.jm, to.jd)) {
    return '—'
  }
  const a = formatJalaliPersian(from.jy, from.jm, from.jd)
  const b = formatJalaliPersian(to.jy, to.jm, to.jd)
  if (from.jy === to.jy && from.jm === to.jm && from.jd === to.jd) return a
  return `${a} تا ${b}`
}

const buyRangeLabel = computed(() => formatRangeLabel(buyFrom, buyTo))
const sellRangeLabel = computed(() => formatRangeLabel(sellFrom, sellTo))

const datePickerTitle = computed(() => {
  switch (datePickTarget.value) {
    case 'buyFrom':
      return 'از تاریخ — خرید'
    case 'buyTo':
      return 'تا تاریخ — خرید'
    case 'sellFrom':
      return 'از تاریخ — فروش'
    case 'sellTo':
      return 'تا تاریخ — فروش'
    default:
      return 'تاریخ'
  }
})

function openDatePick(target) {
  datePickTarget.value = target
  const s =
    target === 'buyFrom'
      ? buyFrom
      : target === 'buyTo'
        ? buyTo
        : target === 'sellFrom'
          ? sellFrom
          : sellTo
  pickDraft.jy = s.jy
  pickDraft.jm = s.jm
  pickDraft.jd = s.jd
  singleDateDialogRef.value?.showModal()
}

function onPickDate(v) {
  pickDraft.jy = v.jy
  pickDraft.jm = v.jm
  pickDraft.jd = v.jd
  const t = datePickTarget.value
  if (t === 'buyFrom') Object.assign(buyFrom, v)
  else if (t === 'buyTo') Object.assign(buyTo, v)
  else if (t === 'sellFrom') Object.assign(sellFrom, v)
  else if (t === 'sellTo') Object.assign(sellTo, v)
  singleDateDialogRef.value?.close()
  datePickTarget.value = null
}

function lotDateLabel(lot) {
  return formatJalaliPersian(lot.jalaliY, lot.jalaliM, lot.jalaliD) || '—'
}

function saleDateLabel(sale) {
  return formatJalaliPersian(sale.jalaliY, sale.jalaliM, sale.jalaliD) || '—'
}

function profitClass(p) {
  if (p == null) return 'text-base-content/60'
  if (p < 0) return 'text-error'
  if (p > 0) return 'text-success'
  return 'text-base-content/80'
}

function open() {
  const t = todayJalali()
  buyFrom.jy = buyTo.jy = sellFrom.jy = sellTo.jy = t.jy
  buyFrom.jm = buyTo.jm = sellFrom.jm = sellTo.jm = t.jm
  buyFrom.jd = buyTo.jd = sellFrom.jd = sellTo.jd = t.jd
  mainDialogRef.value?.showModal()
}

defineExpose({ open })
</script>

<template>
  <dialog ref="mainDialogRef" class="modal">
    <div class="modal-box flex max-h-[90vh] max-w-5xl flex-col gap-4 overflow-hidden p-4 sm:p-6">
      <div class="flex shrink-0 flex-wrap items-start justify-between gap-2 border-b border-base-300 pb-3">
        <div dir="rtl">
          <h3 class="text-lg font-bold">گزارش خرید و فروش</h3>
          <p class="text-sm text-base-content/70">
            برای هر بخش بازهٔ جدا بگذارید: <strong>از تاریخ</strong> و <strong>تا تاریخ</strong>. اگر هر دو یکی باشند، همان
            <strong>یک روز</strong> است.
          </p>
        </div>
        <form method="dialog">
          <button type="submit" class="btn btn-sm">بستن</button>
        </form>
      </div>

      <div class="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <!-- خرید -->
        <div class="flex min-h-0 flex-col rounded-box border border-base-300 bg-base-100">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-base-200 p-3">
            <h4 class="font-semibold" dir="rtl">فاکتورهای خرید (انبار)</h4>
            <div class="flex flex-wrap gap-1">
              <button type="button" class="btn btn-outline btn-xs" @click="openDatePick('buyFrom')">از تاریخ</button>
              <button type="button" class="btn btn-outline btn-xs" @click="openDatePick('buyTo')">تا تاریخ</button>
            </div>
          </div>
          <p class="px-3 pt-2 text-sm text-base-content/70" dir="rtl">
            بازه:
            <span class="font-medium text-base-content" dir="ltr" lang="fa">{{ buyRangeLabel }}</span>
          </p>
          <div class="min-h-0 flex-1 overflow-x-auto overflow-y-auto p-3 pt-2">
            <table v-if="buyRows.length" class="table table-sm">
              <thead>
                <tr>
                  <th dir="rtl">کالا</th>
                  <th dir="rtl">تاریخ</th>
                  <th class="text-end">تعداد</th>
                  <th class="text-end">خرید / واحد</th>
                  <th class="text-end">جمع خرید</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in buyRows" :key="`${row.materialId}-${row.lot.id}-${i}`">
                  <td dir="rtl">{{ row.materialName }}</td>
                  <td dir="ltr" class="whitespace-nowrap text-sm" lang="fa">{{ lotDateLabel(row.lot) }}</td>
                  <td class="text-end tabular-nums">{{ row.qty }}</td>
                  <td class="text-end tabular-nums">{{ formatRial(row.lot.buyPrice) }}</td>
                  <td class="text-end tabular-nums">{{ formatRial(row.lineBuy) }}</td>
                </tr>
              </tbody>
            </table>
            <p v-else class="text-sm text-base-content/60" dir="rtl">در این بازه خریدی ثبت نشده.</p>
          </div>
          <div class="border-t border-base-200 p-3 text-sm font-medium" dir="rtl">
            جمع خرید این بازه:
            <span class="tabular-nums">{{ formatRial(buyRangeTotal) }}</span>
          </div>
        </div>

        <!-- فروش -->
        <div class="flex min-h-0 flex-col rounded-box border border-base-300 bg-base-100">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-base-200 p-3">
            <h4 class="font-semibold" dir="rtl">فاکتورهای فروش (مشتری)</h4>
            <div class="flex flex-wrap gap-1">
              <button type="button" class="btn btn-outline btn-xs" @click="openDatePick('sellFrom')">از تاریخ</button>
              <button type="button" class="btn btn-outline btn-xs" @click="openDatePick('sellTo')">تا تاریخ</button>
            </div>
          </div>
          <p class="px-3 pt-2 text-sm text-base-content/70" dir="rtl">
            بازه:
            <span class="font-medium text-base-content" dir="ltr" lang="fa">{{ sellRangeLabel }}</span>
          </p>
          <div class="min-h-0 flex-1 overflow-x-auto overflow-y-auto p-3 pt-2">
            <table v-if="sellRows.length" class="table table-sm">
              <thead>
                <tr>
                  <th dir="rtl">مشتری</th>
                  <th dir="rtl">تاریخ</th>
                  <th class="text-end">فروش</th>
                  <th class="text-end">بهای تمام‌شده</th>
                  <th class="text-end">سود</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in sellRows" :key="`${row.customerId}-${row.sale.id}-${i}`">
                  <td dir="rtl">{{ row.customerName }}</td>
                  <td dir="ltr" class="whitespace-nowrap text-sm" lang="fa">{{ saleDateLabel(row.sale) }}</td>
                  <td class="text-end tabular-nums">{{ formatRial(row.revenue) }}</td>
                  <td class="text-end tabular-nums text-base-content/80">
                    {{ row.cost != null ? formatRial(row.cost) : '—' }}
                  </td>
                  <td class="text-end tabular-nums font-medium" :class="profitClass(row.profit)">
                    {{ row.profit != null ? formatRial(row.profit) : '—' }}
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-else class="text-sm text-base-content/60" dir="rtl">در این بازه فروشی ثبت نشده.</p>
          </div>
          <div class="flex flex-col gap-1 border-t border-base-200 p-3 text-sm" dir="rtl">
            <p class="font-medium text-success">
              جمع سود این بازه (فقط فاکتورهای با بهای تمام‌شده کامل):
              <span class="tabular-nums">{{ formatRial(sellRangeProfitTotal) }}</span>
            </p>
            <p v-if="sellRows.some((r) => !r.hasFullCost)" class="text-xs text-base-content/60">
              فاکتورهایی که برای همهٔ ردیف‌ها بهای خرید FIFO ندارند در جمع سود نیستند.
            </p>
          </div>
        </div>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button type="submit" aria-label="بستن"> </button>
    </form>
  </dialog>

  <dialog ref="singleDateDialogRef" class="modal z-[60]">
    <div class="modal-box max-w-md">
      <h3 class="text-lg font-bold" dir="rtl">{{ datePickerTitle }}</h3>
      <JalaliDatePicker
        compact
        :model-value="{ jy: pickDraft.jy, jm: pickDraft.jm, jd: pickDraft.jd }"
        @update:model-value="onPickDate"
      />
      <div class="modal-action">
        <form method="dialog">
          <button type="submit" class="btn">بستن</button>
        </form>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button type="submit" aria-label="بستن"> </button>
    </form>
  </dialog>
</template>
