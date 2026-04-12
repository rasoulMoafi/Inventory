<script setup>
const { customers, addCustomer, removeCustomer, addFactorSale } = useCustomers()
const { materials } = useMaterials()
const { todayJalali, formatJalaliPersian, daysInJalaliMonth, isJalaliDateValid } = useJalali()
const { formatRial, formatGrouped, parseRialDigits, onGroupedPriceInput } = useRialInput()

const newCustomerName = ref('')

function normalizeFactorCount(v) {
  const n = Number(v) || 0
  if (n <= 0) return 0
  return Math.round(n * 2) / 2
}

function blankDraftLine() {
  return { materialId: '', count: 1, unitPrice: 0 }
}

const factorLines = ref([blankDraftLine()])

const factorForm = reactive({
  customerId: '',
  jalaliY: todayJalali().jy,
  jalaliM: todayJalali().jm,
  jalaliD: todayJalali().jd,
})

watch(
  () => [factorForm.jalaliY, factorForm.jalaliM],
  () => {
    const max = daysInJalaliMonth(factorForm.jalaliY, factorForm.jalaliM)
    if (factorForm.jalaliD > max) factorForm.jalaliD = max
    if (factorForm.jalaliD < 1) factorForm.jalaliD = 1
  }
)

const factorFormJalaliDisplay = computed(() =>
  formatJalaliPersian(factorForm.jalaliY, factorForm.jalaliM, factorForm.jalaliD)
)

const dateDialogRef = ref(null)
function openDateModal() {
  dateDialogRef.value?.showModal()
}
function closeDateModal() {
  dateDialogRef.value?.close()
}
function onJalaliPicked(v) {
  factorForm.jalaliY = v.jy
  factorForm.jalaliM = v.jm
  factorForm.jalaliD = v.jd
  closeDateModal()
}

const materialsInStock = computed(() => materials.value.filter((m) => totalUnits(m) > 0))

/** Units of this material already allocated in the current factor draft (all rows). */
function draftReservedForMaterial(materialId) {
  if (!materialId) return 0
  return factorLines.value.reduce((sum, line) => {
    if (line.materialId !== materialId) return sum
    return sum + normalizeFactorCount(line.count)
  }, 0)
}

/** Inventory left after subtracting every row’s quantity for this material in the draft. */
function remainingAfterDraft(materialId) {
  const m = materials.value.find((x) => x.id === materialId)
  if (!m) return 0
  return Math.max(0, totalUnits(m) - draftReservedForMaterial(materialId))
}

/** Max count allowed on this row for its material (other rows’ same-SKU counts reserved first). */
function maxCountForLine(rowIdx) {
  const line = factorLines.value[rowIdx]
  if (!line?.materialId) return 0.5
  const m = materials.value.find((x) => x.id === line.materialId)
  if (!m) return 0.5
  const others = factorLines.value.reduce((sum, l, i) => {
    if (i === rowIdx || l.materialId !== line.materialId) return sum
    return sum + normalizeFactorCount(l.count)
  }, 0)
  return Math.max(0.5, totalUnits(m) - others)
}

function materialsSelectableForRow(rowIdx) {
  const line = factorLines.value[rowIdx]
  return materialsInStock.value.filter(
    (m) => remainingAfterDraft(m.id) > 0 || m.id === line.materialId
  )
}

function warehouseUnits(materialId) {
  const m = materials.value.find((x) => x.id === materialId)
  return m ? totalUnits(m) : 0
}

watch(
  factorLines,
  (lines) => {
    lines.forEach((line, idx) => {
      if (!line.materialId) return
      const max = maxCountForLine(idx)
      const c = normalizeFactorCount(line.count)
      if (c > max) line.count = max
      else if (c < 0.5) line.count = Math.min(0.5, max)
    })
  },
  { deep: true }
)

const saleMessage = ref('')
const saleVariant = ref('info')

function addDraftLine() {
  factorLines.value.push(blankDraftLine())
}

function removeDraftLine(i) {
  if (factorLines.value.length <= 1) {
    factorLines.value = [blankDraftLine()]
    return
  }
  factorLines.value.splice(i, 1)
}

const activeUnitPriceIdx = ref(null)
const unitPriceDraft = ref('')

function onUnitPriceFocus(idx, current) {
  activeUnitPriceIdx.value = idx
  unitPriceDraft.value = formatGrouped(current)
}

function onUnitPriceInput(e) {
  onGroupedPriceInput(e, unitPriceDraft)
}

function onUnitPriceBlur() {
  const idx = activeUnitPriceIdx.value
  if (idx == null || !factorLines.value[idx]) {
    activeUnitPriceIdx.value = null
    return
  }
  factorLines.value[idx].unitPrice = parseRialDigits(unitPriceDraft.value)
  activeUnitPriceIdx.value = null
}

function commitUnitPriceIfEditing() {
  const idx = activeUnitPriceIdx.value
  if (idx == null || !factorLines.value[idx]) return
  factorLines.value[idx].unitPrice = parseRialDigits(unitPriceDraft.value)
  activeUnitPriceIdx.value = null
}

function submitNewCustomer(e) {
  e.preventDefault()
  const n = newCustomerName.value.trim()
  if (!n) return
  addCustomer(n)
  newCustomerName.value = ''
}

function confirmRemoveCustomer(c) {
  const name = (c?.name ?? '').trim() || 'این مشتری'
  if (
    !window.confirm(
      `مشتری «${name}» حذف شود؟\n\nهمه فاکتورهای ذخیره‌شده این مشتری پاک می‌شود. موجودی انبار تغییر نمی‌کند. این کار برگشت‌ناپذیر است.`
    )
  ) {
    return
  }
  removeCustomer(c.id)
}

function draftLineTotal(line) {
  return (Number(line.count) || 0) * (Number(line.unitPrice) || 0)
}

const factorPreviewTotal = computed(() => factorLines.value.reduce((s, l) => s + draftLineTotal(l), 0))

const allCustomersProfitLoss = computed(() => {
  let totalProfit = 0
  let totalSaleLoss = 0
  let hasIncomplete = false

  for (const c of customers.value) {
    const s = customerProfitSummary(c)
    if (s.hasIncomplete) hasIncomplete = true
    const p = Number(s.profit) || 0
    if (p >= 0) totalProfit += p
    else totalSaleLoss += Math.abs(p)
  }

  return {
    totalProfit,
    totalSaleLoss,
    net: totalProfit - totalSaleLoss,
    hasIncomplete,
  }
})

/** مجموع فیلد «بدهی» همه فاکتورها (مستقل از زیان سود). */
const allCustomersDebtTotal = computed(() =>
  customers.value.reduce((sum, c) => sum + customerDebtTotal(c), 0)
)

function submitFactor(e) {
  e.preventDefault()
  saleMessage.value = ''
  commitUnitPriceIfEditing()

  if (!isJalaliDateValid(factorForm.jalaliY, factorForm.jalaliM, factorForm.jalaliD)) {
    saleMessage.value = 'تاریخ شمسی معتبر نیست.'
    saleVariant.value = 'error'
    return
  }
  if (!factorForm.customerId) {
    saleMessage.value = 'یک مشتری انتخاب کنید.'
    saleVariant.value = 'warning'
    return
  }

  const lines = factorLines.value
    .filter((l) => l.materialId && (Number(l.count) || 0) > 0)
    .map((l) => ({
      materialId: l.materialId,
      count: normalizeFactorCount(l.count),
      unitPrice: Math.max(0, Number(l.unitPrice) || 0),
    }))

  if (!lines.length) {
    saleMessage.value = 'حداقل یک ردیف با کالا و تعداد اضافه کنید.'
    saleVariant.value = 'warning'
    return
  }

  const r = addFactorSale({
    customerId: factorForm.customerId,
    jalaliY: Math.trunc(factorForm.jalaliY),
    jalaliM: Math.trunc(factorForm.jalaliM),
    jalaliD: Math.trunc(factorForm.jalaliD),
    lines,
  })

  if (!r.ok) {
    saleMessage.value = r.error || 'ثبت فروش انجام نشد.'
    saleVariant.value = 'error'
    return
  }

  saleMessage.value = 'فاکتور ذخیره شد؛ موجودی برای همه سطرها به‌روز شد (FIFO).'
  saleVariant.value = 'success'
  factorLines.value = [blankDraftLine()]
}
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-8 px-4 py-8">
    <div class="breadcrumbs text-sm">
      <ul>
        <li><NuxtLink to="/">خانه</NuxtLink></li>
        <li>مشتریان</li>
      </ul>
    </div>

    <div class="hero rounded-box border border-base-300 bg-base-100 shadow-md">
      <div class="hero-content flex-col py-8 text-center">
        <div class="max-w-2xl space-y-2">
          <h1 class="text-3xl font-bold tracking-tight sm:text-4xl">مشتریان</h1>
          <p class="text-base-content/70">
            یک <span class="font-medium">فاکتور</span> با چند کالا بسازید: برای هر ردیف
            <span class="font-medium">تعداد</span> و <span class="font-medium">قیمت فروش هر واحد</span>. وقتی فاکتور کامل شد
            <strong>ثبت فروش</strong> را بزنید تا یک‌بار از موجودی کم شود. با باز کردن هر مشتری، فروش‌های قبلی به ترتیب دیده می‌شود.
          </p>
        </div>
      </div>
    </div>

    <div class="card border border-base-300 bg-base-100 shadow-xl">
      <div class="card-body gap-4">
        <h2 class="card-title">مشتری جدید</h2>
        <form class="flex flex-col gap-3 sm:flex-row sm:items-end" @submit="submitNewCustomer">
          <label class="form-control flex-1">
            <div class="label pt-0">
              <span class="label-text font-medium">نام مشتری</span>
            </div>
            <input
              v-model="newCustomerName"
              type="text"
              class="input input-bordered w-full"
              placeholder="مثال: عمده‌فروشی شمال"
              required
            />
          </label>
          <button type="submit" class="btn btn-primary sm:shrink-0">افزودن مشتری</button>
        </form>
      </div>
    </div>

    <div class="card border border-base-300 bg-base-100 shadow-xl">
      <div class="card-body gap-4">
        <h2 class="card-title">فاکتور جدید (چند ردیف)</h2>
        <p class="text-sm text-base-content/70">
          برای هر کالا یک ردیف اضافه کنید. موجودی از قدیمی‌ترین خریدها کم می‌شود (FIFO). ردیف‌های ناقص (بدون کالا) هنگام ثبت نادیده گرفته می‌شوند.
        </p>
        <p class="text-sm text-base-content/60">
          عدد داخل پرانتز در لیست کالا، <strong>مانده موجودی</strong> پس از کم کردن همه تعدادهای همین فاکتور است (چند ردیف برای یک کالا با هم جمع می‌شود).
        </p>

        <form class="space-y-4" @submit="submitFactor">
          <div
            v-if="saleMessage"
            role="status"
            class="alert text-sm"
            :class="{
              'alert-success': saleVariant === 'success',
              'alert-error': saleVariant === 'error',
              'alert-warning': saleVariant === 'warning',
              'alert-info': saleVariant === 'info',
            }"
          >
            <span>{{ saleMessage }}</span>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <label class="form-control w-full">
              <div class="label pt-0">
                <span class="label-text font-medium">مشتری</span>
              </div>
              <select v-model="factorForm.customerId" class="select select-bordered w-full" required>
                <option disabled value="">مشتری را انتخاب کنید…</option>
                <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
              <p v-if="!customers.length" class="label-text-alt text-warning">ابتدا یک مشتری اضافه کنید.</p>
            </label>

            <label class="form-control w-full">
              <div class="label pt-0">
                <span class="label-text font-medium">تاریخ شمسی (تاریخ فاکتور)</span>
              </div>
              <div class="join w-full">
                <input
                  readonly
                  type="text"
                  class="input input-bordered join-item min-w-0 flex-1 cursor-pointer"
                  dir="rtl"
                  lang="fa"
                  :value="factorFormJalaliDisplay"
                  @click="openDateModal"
                />
                <button type="button" class="btn btn-square join-item shrink-0 border-base-300" aria-label="تقویم" @click="openDateModal">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              </div>
            </label>
          </div>

          <div class="overflow-x-auto rounded-box border border-base-300">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>کالا</th>
                  <th class="w-28 text-end">تعداد</th>
                  <th class="min-w-[9rem] text-end">فروش / واحد (تومن)</th>
                  <th class="text-end">جمع ردیف</th>
                  <th class="w-12"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(line, idx) in factorLines" :key="idx">
                  <td>
                    <select v-model="line.materialId" class="select select-bordered select-sm w-full min-w-[10rem]">
                      <option value="">انتخاب…</option>
                      <option v-for="m in materialsSelectableForRow(idx)" :key="m.id" :value="m.id">
                        {{ m.name }} ({{ remainingAfterDraft(m.id) }})
                      </option>
                    </select>
                  </td>
                  <td class="text-end">
                    <input
                      v-model.number="line.count"
                      type="number"
                      min="0.5"
                      :max="line.materialId ? maxCountForLine(idx) : 0.5"
                      step="0.5"
                      class="input input-bordered input-sm w-full text-end tabular-nums"
                    />
                    <p v-if="line.materialId" class="label-text-alt mt-0.5 text-end text-base-content/50">
                      حداکثر {{ maxCountForLine(idx) }} از {{ warehouseUnits(line.materialId) }} در انبار
                    </p>
                  </td>
                  <td class="text-end">
                    <input
                      type="text"
                      inputmode="numeric"
                      autocomplete="off"
                      class="input input-bordered input-sm w-full text-end tabular-nums"
                      :value="activeUnitPriceIdx === idx ? unitPriceDraft : formatGrouped(line.unitPrice)"
                      @focus="onUnitPriceFocus(idx, line.unitPrice)"
                      @input="onUnitPriceInput"
                      @blur="onUnitPriceBlur"
                    />
                  </td>
                  <td class="text-end tabular-nums text-base-content/80">{{ formatRial(draftLineTotal(line)) }}</td>
                  <td>
                    <button type="button" class="btn btn-ghost btn-xs text-error" aria-label="حذف ردیف" @click="removeDraftLine(idx)">✕</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-3">
            <button type="button" class="btn btn-outline btn-sm" @click="addDraftLine">ردیف جدید</button>
            <div class="text-sm">
              <span class="text-base-content/70">جمع فاکتور:</span>
              <span class="ms-2 font-semibold tabular-nums">{{ formatRial(factorPreviewTotal) }}</span>
            </div>
          </div>

          <p v-if="!materialsInStock.length" class="text-sm text-warning">موجودی نیست. ابتدا از صفحه انبار کالا اضافه کنید.</p>

          <div class="card-actions justify-end">
            <button type="submit" class="btn btn-primary" :disabled="!customers.length || !materialsInStock.length">ثبت فروش</button>
          </div>
        </form>

        <dialog ref="dateDialogRef" class="modal">
          <div class="modal-box max-w-md">
            <h3 class="text-lg font-bold" dir="rtl">انتخاب تاریخ شمسی</h3>
            <JalaliDatePicker
              compact
              :model-value="{ jy: factorForm.jalaliY, jm: factorForm.jalaliM, jd: factorForm.jalaliD }"
              @update:model-value="onJalaliPicked"
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
      </div>
    </div>

    <div class="divider">کارت مشتریان</div>

    <div v-if="!customers.length" class="alert alert-info">
      <span>هنوز مشتری نیست. از بالا اضافه کنید، سپس فروش ثبت کنید. هر کارت به تاریخچه فروش همان مشتری می‌رود.</span>
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div v-for="c in customers" :key="c.id" class="card border border-base-300 bg-base-100 shadow-md transition-shadow hover:shadow-lg">
        <div class="card-body">
          <h3 class="card-title text-lg">{{ c.name }}</h3>
          <p class="text-sm text-base-content/70">
            {{ customerFactorCount(c) }} فروش · جمع {{ formatRial(customerTotalSoldRial(c)) }}
          </p>
          <div class="card-actions mt-2 justify-between gap-2">
            <NuxtLink :to="`/customers/${c.id}`" class="btn btn-primary btn-sm">فروش‌ها</NuxtLink>
            <button type="button" class="btn btn-ghost btn-sm text-error" @click="confirmRemoveCustomer(c)">حذف</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="customers.length" class="card border border-base-300 bg-base-200/40 shadow-md">
      <div class="card-body gap-2">
        <h3 class="card-title text-lg">جمع سود و بدهی همه مشتری‌ها</h3>
        <div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <p class="font-semibold text-success">
            مجموع سود:
            <span class="ms-1 tabular-nums">{{ formatRial(allCustomersProfitLoss.totalProfit) }}</span>
          </p>
          <p class="font-semibold text-error">
            مجموع بدهی:
            <span class="ms-1 tabular-nums">{{ formatRial(allCustomersDebtTotal) }}</span>
          </p>
          <p class="text-base font-bold tabular-nums" :class="allCustomersProfitLoss.net >= 0 ? 'text-success' : 'text-error'">
            خالص سود:
            <span class="ms-1">{{ formatRial(allCustomersProfitLoss.net) }}</span>
          </p>
          <p class="text-sm text-base-content/70">
            زیان فروش (جمع سودهای منفی):
            <span class="ms-1 tabular-nums text-error">{{ formatRial(allCustomersProfitLoss.totalSaleLoss) }}</span>
          </p>
        </div>
        <p v-if="allCustomersProfitLoss.hasIncomplete" class="text-sm text-base-content/70">
          برخی فاکتورها بهای خرید FIFO ندارند و طبق منطق فعلی در محاسبه سود نادیده گرفته می‌شوند. مجموع بدهی از همان مقادیر ثبت‌شده در هر فاکتور است.
        </p>
      </div>
    </div>
  </div>
</template>
