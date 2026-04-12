<script setup>
const route = useRoute()
const customerId = computed(() => String(route.params.id ?? ''))

const { getCustomer, removeCustomerSale, updateCustomerSaleDebt } = useCustomers()
const { formatJalaliPersian } = useJalali()
const { formatRial, formatGrouped, parseRialDigits, onGroupedPriceInput } = useRialInput()

const customer = computed(() => getCustomer(customerId.value))

const salesOrdered = computed(() => {
  const c = customer.value
  if (!c) return []
  const list = sortedCustomerSales(c)
  const n = list.length
  return list.map((sale, i) => {
    const hasCost = saleHasFullCostData(sale)
    const profit = saleProfit(sale)
    const buyCost = saleInventoryBuyCost(sale)
    return {
      sale,
      indexLabel: n - i,
      dateLabel: formatJalaliPersian(sale.jalaliY, sale.jalaliM, sale.jalaliD) || '—',
      grand: saleGrandTotal(sale),
      hasCost,
      profit,
      buyCost,
    }
  })
})

const profitSummary = computed(() => {
  const c = customer.value
  if (!c) return null
  return customerProfitSummary(c)
})

const debtSummary = computed(() => {
  const c = customer.value
  if (!c) return 0
  return customerDebtTotal(c)
})

const debtDraftBySaleId = ref({})

function getDebtDisplay(sale) {
  return debtDraftBySaleId.value[sale.id] ?? formatGrouped(sale.debt || 0)
}

function onDebtFocus(sale) {
  debtDraftBySaleId.value = {
    ...debtDraftBySaleId.value,
    [sale.id]: formatGrouped(sale.debt || 0),
  }
}

function onDebtInput(sale, e) {
  const draft = ref(getDebtDisplay(sale))
  onGroupedPriceInput(e, draft)
  debtDraftBySaleId.value = {
    ...debtDraftBySaleId.value,
    [sale.id]: draft.value,
  }
}

function onDebtBlur(sale) {
  const draft = debtDraftBySaleId.value[sale.id]
  const value = parseRialDigits(draft ?? formatGrouped(sale.debt || 0))
  updateCustomerSaleDebt(customerId.value, sale.id, value)
  const next = { ...debtDraftBySaleId.value }
  delete next[sale.id]
  debtDraftBySaleId.value = next
}

function profitClass(amount) {
  if (amount == null) return ''
  if (amount < 0) return 'text-error'
  if (amount > 0) return 'text-success'
  return 'text-base-content/80'
}

const deleteMessage = ref('')

function confirmDeleteFactor(sale) {
  deleteMessage.value = ''
  const ok = window.confirm(
    'این فاکتور حذف شود؟ واحدها به انبار برمی‌گردد (یک سطر خرید به ازای هر ردیف، با تاریخ شمسی فاکتور و قیمت‌های ذخیره‌شده).'
  )
  if (!ok) return
  const r = removeCustomerSale(customerId.value, sale.id)
  if (!r.ok) deleteMessage.value = r.error || 'حذف فاکتور انجام نشد.'
  else deleteMessage.value = ''
}
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-8 px-4 py-8">
    <div class="breadcrumbs text-sm">
      <ul>
        <li><NuxtLink to="/">خانه</NuxtLink></li>
        <li><NuxtLink to="/customers">مشتریان</NuxtLink></li>
        <li v-if="customer">{{ customer.name }}</li>
        <li v-else>یافت نشد</li>
      </ul>
    </div>

    <template v-if="customer">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">{{ customer.name }}</h1>
          <p class="mt-1 text-base-content/70">
            هر کارت یک فاکتور است. سود از اختلاف <strong>قیمت خرید انبار</strong> (FIFO) با مبلغی است که مشتری به ازای هر ردیف پرداخته است.
          </p>
        </div>
        <NuxtLink to="/customers" class="btn btn-outline btn-sm">همه مشتریان</NuxtLink>
      </div>

      <div v-if="deleteMessage" class="alert alert-error text-sm">
        <span>{{ deleteMessage }}</span>
      </div>

      <div v-if="!salesOrdered.length" class="alert alert-ghost">
        <span>هنوز فروشی ثبت نشده. در صفحه مشتریان فاکتور بسازید و <strong>ثبت فروش</strong> را بزنید.</span>
      </div>

      <div v-else class="space-y-6">
        <div v-for="item in salesOrdered" :key="item.sale.id" class="card border border-base-300 bg-base-100 shadow-md">
          <div class="card-body gap-4">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-base-300 pb-3">
              <div>
                <h2 class="text-lg font-semibold" dir="rtl" lang="fa">{{ item.dateLabel }}</h2>
                <p class="text-xs text-base-content/60">فروش شماره {{ item.indexLabel }} · تاریخ شمسی</p>
              </div>
              <div class="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  class="btn btn-outline btn-error btn-sm"
                  @click="confirmDeleteFactor(item.sale)"
                >
                  حذف فاکتور
                </button>
                <div class="badge badge-lg badge-neutral tabular-nums">{{ formatRial(item.grand) }}</div>
              </div>
            </div>

            <div class="overflow-x-auto rounded-box border border-base-200">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>کالا</th>
                    <th class="text-end">تعداد</th>
                    <th class="text-end">فروش / واحد</th>
                    <th class="text-end">مبلغ فروش</th>
                    <th class="text-end">بهای تمام‌شده (FIFO)</th>
                    <th class="text-end">سود</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="line in item.sale.lines" :key="line.id">
                    <td>{{ line.materialName }}</td>
                    <td class="text-end tabular-nums">{{ line.count }}</td>
                    <td class="text-end tabular-nums">{{ formatRial(line.unitPrice) }}</td>
                    <td class="text-end tabular-nums">{{ formatRial(saleLineTotal(line)) }}</td>
                    <td class="text-end tabular-nums text-base-content/80">
                      {{ saleLineBuyCost(line) != null ? formatRial(saleLineBuyCost(line)) : '—' }}
                    </td>
                    <td class="text-end tabular-nums font-medium" :class="profitClass(saleLineProfit(line))">
                      {{ saleLineProfit(line) != null ? formatRial(saleLineProfit(line)) : '—' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-if="item.hasCost" class="flex flex-col gap-1 border-t border-base-300 pt-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
              <div class="text-sm text-base-content/70">
                جمع بهای تمام‌شده فاکتور:
                <span class="ms-1 font-medium tabular-nums text-base-content">{{ formatRial(item.buyCost) }}</span>
              </div>
              <div class="text-sm font-semibold">
                سود این فاکتور:
                <span class="ms-1 tabular-nums" :class="profitClass(item.profit)">{{ formatRial(item.profit) }}</span>
              </div>
            </div>
            <p v-else class="border-t border-base-300 pt-3 text-sm text-base-content/60">
              برای این فاکتور سود محاسبه نشده — قبل از ذخیره بهای خرید روی هر ردیف ثبت نمی‌شد.
            </p>
            <div class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-end">
              <label class="form-control w-full sm:w-64">
                <div class="label py-0.5">
                  <span class="label-text text-error">بدهی</span>
                </div>
                <input
                  type="text"
                  inputmode="numeric"
                  autocomplete="off"
                  class="input input-bordered input-sm w-full text-end tabular-nums text-error"
                  :value="getDebtDisplay(item.sale)"
                  @focus="onDebtFocus(item.sale)"
                  @input="onDebtInput(item.sale, $event)"
                  @blur="onDebtBlur(item.sale)"
                />
              </label>
              <div class="text-sm font-semibold text-error">
                بدهی این فاکتور:
                <span class="ms-1 tabular-nums">{{ formatRial(item.sale.debt || 0) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="salesOrdered.length && profitSummary" class="card border border-base-300 bg-base-200/40 shadow-md">
        <div class="card-body gap-2">
          <h3 class="card-title text-lg">جمع سود این مشتری</h3>
          <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
            <p class="text-2xl font-bold tabular-nums" :class="profitClass(profitSummary.profit)">
              {{ formatRial(profitSummary.profit) }}
            </p>
            <p class="text-xl font-bold tabular-nums text-error">
              جمع بدهی این مشتری:
              <span class="ms-1">{{ formatRial(debtSummary) }}</span>
            </p>
          </div>
          <p v-if="profitSummary.hasIncomplete" class="text-sm text-base-content/70">
            فقط فاکتورهایی که برای همه ردیف‌ها بهای خرید FIFO دارند جمع شده‌اند. فاکتورهای قدیمی بدون این داده در مجموع نیستند.
          </p>
          <p v-else class="text-sm text-base-content/60">جمع سود فاکتورهای بالا (فروش منهای بهای خرید انبار).</p>
        </div>
      </div>
    </template>

    <div v-else class="alert alert-warning flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <span>این مشتری وجود ندارد یا حذف شده است.</span>
      <NuxtLink to="/customers" class="btn btn-sm">بازگشت به مشتریان</NuxtLink>
    </div>
  </div>
</template>
