<script setup>
const {
  materials,
  addPurchase,
  renameMaterial,
  updateLatestLotField,
  updateLotById,
  reorderMaterials,
} = useMaterials()

const { todayJalali, formatJalaliPersian, daysInJalaliMonth, isJalaliDateValid } = useJalali()

const _today = todayJalali()
const form = reactive({
  addMode: 'new',
  existingMaterialId: '',
  newName: '',
  count: 0,
  buyPrice: 0,
  sellPrice: 0,
  jalaliY: _today.jy,
  jalaliM: _today.jm,
  jalaliD: _today.jd,
})

watch(
  () => [form.jalaliY, form.jalaliM],
  () => {
    const max = daysInJalaliMonth(form.jalaliY, form.jalaliM)
    if (form.jalaliD > max) form.jalaliD = max
    if (form.jalaliD < 1) form.jalaliD = 1
  }
)

const expandedMaterialId = ref(null)

const editLotDialogRef = ref(null)
const editLotJalaliDialogRef = ref(null)
const editMaterialId = ref(null)
const editLotId = ref(null)
const editForm = reactive({
  count: 0,
  buyPrice: 0,
  sellPrice: 0,
  jalaliY: _today.jy,
  jalaliM: _today.jm,
  jalaliD: _today.jd,
})

watch(
  () => [editForm.jalaliY, editForm.jalaliM],
  () => {
    const max = daysInJalaliMonth(editForm.jalaliY, editForm.jalaliM)
    if (editForm.jalaliD > max) editForm.jalaliD = max
    if (editForm.jalaliD < 1) editForm.jalaliD = 1
  }
)

const editActivePriceField = ref(null)
const editPriceDraft = ref('')

const editJalaliDisplay = computed(() =>
  formatJalaliPersian(editForm.jalaliY, editForm.jalaliM, editForm.jalaliD)
)

function openEditLotJalaliModal() {
  editLotJalaliDialogRef.value?.showModal()
}

function closeEditLotJalaliModal() {
  editLotJalaliDialogRef.value?.close()
}

function onEditLotJalaliPicked(v) {
  editForm.jalaliY = v.jy
  editForm.jalaliM = v.jm
  editForm.jalaliD = v.jd
  closeEditLotJalaliModal()
}

function openEditLot(m, lot) {
  editMaterialId.value = m.id
  editLotId.value = lot.id
  editForm.count = lot.count
  editForm.buyPrice = lot.buyPrice
  editForm.sellPrice = lot.sellPrice
  editForm.jalaliY = lot.jalaliY ?? _today.jy
  editForm.jalaliM = lot.jalaliM ?? _today.jm
  editForm.jalaliD = lot.jalaliD ?? _today.jd
  editActivePriceField.value = null
  editLotDialogRef.value?.showModal()
}

function onEditLotDialogClose() {
  editMaterialId.value = null
  editLotId.value = null
  editActivePriceField.value = null
}

function commitEditPriceIfEditing() {
  const f = editActivePriceField.value
  if (!f) return
  editForm[f] = parseRialDigits(editPriceDraft.value)
  editActivePriceField.value = null
}

function onEditPriceFocus(field) {
  editActivePriceField.value = field
  editPriceDraft.value = formatGrouped(editForm[field])
}

function onEditPriceInput(e) {
  onGroupedPriceInput(e, editPriceDraft)
}

function onEditPriceBlur(field) {
  editForm[field] = parseRialDigits(editPriceDraft.value)
  editActivePriceField.value = null
}

function saveEditLot() {
  commitEditPriceIfEditing()
  const mid = editMaterialId.value
  const lid = editLotId.value
  if (!mid || !lid) return
  if (!isJalaliDateValid(editForm.jalaliY, editForm.jalaliM, editForm.jalaliD)) return
  updateLotById(mid, lid, {
    count: Math.max(0, Number(editForm.count) || 0),
    buyPrice: Math.max(0, Number(editForm.buyPrice) || 0),
    sellPrice: Math.max(0, Number(editForm.sellPrice) || 0),
    jalaliY: Math.trunc(editForm.jalaliY),
    jalaliM: Math.trunc(editForm.jalaliM),
    jalaliD: Math.trunc(editForm.jalaliD),
  })
  editLotDialogRef.value?.close()
}

let inventoryRowClickBlockedUntil = 0

const dragInventoryMaterialId = ref(null)
const dragOverInventoryIndex = ref(null)

function onInventoryDragStart(e, m) {
  dragInventoryMaterialId.value = m.id
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', m.id)
}

function onInventoryDragEnd() {
  dragInventoryMaterialId.value = null
  dragOverInventoryIndex.value = null
  inventoryRowClickBlockedUntil = Date.now() + 400
}

function onInventoryDragOver(e, idx) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  dragOverInventoryIndex.value = idx
}

function onInventoryDrop(e, toIndex) {
  e.preventDefault()
  const id = dragInventoryMaterialId.value || e.dataTransfer.getData('text/plain')
  if (!id) return
  const fromIndex = materials.value.findIndex((x) => x.id === id)
  if (fromIndex === -1) return
  reorderMaterials(fromIndex, toIndex)
  onInventoryDragEnd()
}

function onMaterialRowClick(m, e) {
  if (Date.now() < inventoryRowClickBlockedUntil) return
  if (e.target.closest('[data-drag-handle], input, button, textarea, select, a, label')) return
  expandedMaterialId.value = expandedMaterialId.value === m.id ? null : m.id
}

function rowJalaliDisplay(m) {
  const l = getLatestLot(m)
  if (!l) return '—'
  return formatJalaliPersian(l.jalaliY, l.jalaliM, l.jalaliD) || '—'
}

function rowLotJalaliDisplay(lot) {
  return formatJalaliPersian(lot.jalaliY, lot.jalaliM, lot.jalaliD) || '—'
}

function resetFormJalaliToToday() {
  const t = todayJalali()
  form.jalaliY = t.jy
  form.jalaliM = t.jm
  form.jalaliD = t.jd
}

const dateDialogRef = ref(null)

function openDateModal() {
  dateDialogRef.value?.showModal()
}

function closeDateModal() {
  dateDialogRef.value?.close()
}

function onJalaliPicked(v) {
  form.jalaliY = v.jy
  form.jalaliM = v.jm
  form.jalaliD = v.jd
  closeDateModal()
}

const formJalaliDisplay = computed(() =>
  formatJalaliPersian(form.jalaliY, form.jalaliM, form.jalaliD)
)

const rialFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

function formatRial(n) {
  return `${rialFormatter.format(Number(n) || 0)} تومن`
}

function formatGrouped(n) {
  return rialFormatter.format(Number(n) || 0)
}

function parseRialDigits(s) {
  const digits = String(s).replace(/\D/g, '')
  return digits === '' ? 0 : Number(digits)
}

function countDigitsBeforeIndex(str, index) {
  const end = Math.min(index ?? 0, str.length)
  let n = 0
  for (let i = 0; i < end; i++) {
    if (/\d/.test(str[i])) n++
  }
  return n
}

function indexAfterDigitCount(formatted, digitCount) {
  if (digitCount <= 0) return 0
  let seen = 0
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) {
      seen++
      if (seen === digitCount) return i + 1
    }
  }
  return formatted.length
}

function groupedDisplayFromDigits(digits) {
  if (digits === '') return ''
  const n = Number(digits)
  if (!Number.isFinite(n) || n < 0) return ''
  return rialFormatter.format(n)
}

function onGroupedPriceInput(e, draftRef) {
  const input = e.target
  const raw = input.value
  const sel = input.selectionStart ?? raw.length
  const digitsBefore = countDigitsBeforeIndex(raw, sel)
  const digits = raw.replace(/\D/g, '')
  const display = groupedDisplayFromDigits(digits)
  draftRef.value = display
  nextTick(() => {
    const pos = indexAfterDigitCount(display, digitsBefore)
    try {
      input.setSelectionRange(pos, pos)
    } catch {
      /* detached input */
    }
  })
}

function priceKeyLatest(mid, field) {
  return `L:${mid}:${field}`
}

const activePriceKey = ref(null)
const priceDraft = ref('')

function onTablePriceFocus(key, current) {
  activePriceKey.value = key
  priceDraft.value = formatGrouped(current)
}

function onTablePriceInput(e) {
  onGroupedPriceInput(e, priceDraft)
}

function onTablePriceBlur() {
  const key = activePriceKey.value
  if (!key) return
  const v = parseRialDigits(priceDraft.value)
  if (key.startsWith('L:')) {
    const parts = key.split(':')
    const mid = parts[1]
    const field = parts[2]
    updateLatestLotField(mid, field, v)
  } else if (key.startsWith('P:')) {
    const parts = key.split(':')
    const mid = parts[1]
    const lid = parts[2]
    const field = parts[3]
    updateLotById(mid, lid, { [field]: v })
  }
  activePriceKey.value = null
}

const activeFormPriceField = ref(null)
const formPriceDraft = ref('')

function onFormPriceFocus(field) {
  activeFormPriceField.value = field
  formPriceDraft.value = formatGrouped(form[field])
}

function onFormPriceInput(e) {
  onGroupedPriceInput(e, formPriceDraft)
}

function onFormPriceBlur(field) {
  form[field] = parseRialDigits(formPriceDraft.value)
  activeFormPriceField.value = null
}

function commitFormPriceIfEditing() {
  const f = activeFormPriceField.value
  if (!f) return
  form[f] = parseRialDigits(formPriceDraft.value)
  activeFormPriceField.value = null
}

const totalBuyValue = computed(() =>
  materials.value.reduce((sum, m) => sum + lineBuyTotal(m), 0)
)
const totalSellValue = computed(() =>
  materials.value.reduce((sum, m) => sum + lineSellTotal(m), 0)
)

const materialCount = computed(() => materials.value.length)

const materialOptions = computed(() =>
  materials.value.map((m) => ({ value: m.id, label: m.name }))
)

const grandTotalUnits = computed(() =>
  materials.value.reduce((sum, m) => sum + totalUnits(m), 0)
)

function submitAdd(e) {
  e.preventDefault()
  commitFormPriceIfEditing()
  if (!isJalaliDateValid(form.jalaliY, form.jalaliM, form.jalaliD)) return

  const lotPayload = {
    count: form.count,
    buyPrice: form.buyPrice,
    sellPrice: form.sellPrice,
    jalaliY: Math.trunc(form.jalaliY),
    jalaliM: Math.trunc(form.jalaliM),
    jalaliD: Math.trunc(form.jalaliD),
  }

  if (form.addMode === 'existing') {
    if (!form.existingMaterialId) return
    addPurchase({
      materialId: form.existingMaterialId,
      ...lotPayload,
    })
  } else {
    if (!form.newName.trim()) return
    addPurchase({
      name: form.newName.trim(),
      ...lotPayload,
    })
  }

  form.newName = ''
  form.existingMaterialId = ''
  form.count = 0
  form.buyPrice = 0
  form.sellPrice = 0
  resetFormJalaliToToday()
}

function onNameChange(id, raw) {
  renameMaterial(id, raw)
}

</script>

<template>
  <div class="mx-auto max-w-6xl space-y-8 px-4 py-8">
    <div class="breadcrumbs text-sm">
      <ul>
        <li><NuxtLink to="/">خانه</NuxtLink></li>
        <li>کالاها</li>
      </ul>
    </div>

    <div class="hero rounded-box border border-base-300 bg-base-100 shadow-md">
      <div class="hero-content flex-col py-8 text-center">
        <div class="max-w-lg space-y-2">
          <h1 class="text-3xl font-bold tracking-tight sm:text-4xl">انبار کالا</h1>
          <p class="text-base-content/70">
            تعداد، قیمت خرید و فروش به <span class="badge badge-neutral badge-sm">تومن</span> — ذخیره در
            <kbd class="kbd kbd-sm">حافظهٔ مرورگر</kbd>
          </p>
        </div>
      </div>
    </div>

    <div class="divider">افزودن و مدیریت</div>

    <div class="card border border-base-300 bg-base-100 shadow-xl">
      <div class="card-body gap-4">
        <h2 class="card-title">
          <span>افزودن کالا</span>
          <div class="badge badge-secondary badge-outline">فرم</div>
        </h2>

        <form @submit="submitAdd">
          <fieldset class="fieldset border-base-300 rounded-box border p-4">
            <legend class="fieldset-legend">جزئیات کالا</legend>

            <div class="form-control mb-4">
              <div class="label pt-0">
                <span class="label-text font-medium">کالا</span>
              </div>
              <div class="flex flex-wrap gap-4">
                <label class="label cursor-pointer gap-2">
                  <input v-model="form.addMode" type="radio" name="addMode" value="new" class="radio radio-primary" />
                  <span>جدید — نام را بنویسید</span>
                </label>
                <label class="label cursor-pointer gap-2">
                  <input
                    v-model="form.addMode"
                    type="radio"
                    name="addMode"
                    value="existing"
                    class="radio radio-primary"
                    :disabled="!materials.length"
                  />
                  <span>موجود — از لیست انتخاب کنید</span>
                </label>
              </div>
            </div>

            <div v-if="form.addMode === 'new'" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:items-end">
              <label class="form-control w-full sm:col-span-2 lg:col-span-1">
                <div class="label">
                  <span class="label-text font-medium">نام کالای جدید</span>
                </div>
                <input
                  v-model="form.newName"
                  type="text"
                  class="input input-bordered w-full"
                  placeholder="مثال: تخته چوب"
                  :required="form.addMode === 'new'"
                />
              </label>
            </div>

            <div v-else class="form-control mb-4 w-full max-w-md">
              <div class="label">
                <span class="label-text font-medium">انتخاب کالا</span>
              </div>
              <SearchableSelect
                v-model="form.existingMaterialId"
                :options="materialOptions"
                placeholder="کالا را انتخاب کنید…"
                required
              />
              <p v-if="!materials.length" class="label-text-alt text-warning">ابتدا یک کالای جدید اضافه کنید.</p>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:items-end">
              <label class="form-control w-full">
                <div class="label">
                  <span class="label-text font-medium">تعداد (این خرید)</span>
                  <span class="label-text-alt text-base-content/50">عدد</span>
                </div>
                <input
                  v-model.number="form.count"
                  type="number"
                  min="0"
                  step="1"
                  class="input input-bordered w-full"
                />
              </label>
              <label class="form-control w-full">
                <div class="label">
                  <span class="label-text font-medium">تاریخ شمسی</span>
                  <span class="label-text-alt badge badge-ghost badge-sm">شمسی</span>
                </div>
                <div class="join w-full">
                  <input
                    readonly
                    type="text"
                    class="input input-bordered join-item min-w-0 flex-1 cursor-pointer"
                    dir="rtl"
                    lang="fa"
                    :value="formJalaliDisplay"
                    placeholder="برای انتخاب کلیک کنید"
                    aria-haspopup="dialog"
                    aria-controls="jalali-date-modal"
                    @click="openDateModal"
                  />
                  <button
                    type="button"
                    class="btn btn-square join-item shrink-0 border-base-300"
                    aria-label="باز کردن تقویم"
                    @click="openDateModal"
                  >
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
              <label class="form-control w-full">
                <div class="label">
                  <span class="label-text font-medium">خرید (تومن / هر عدد)</span>
                </div>
                <input
                  type="text"
                  inputmode="numeric"
                  autocomplete="off"
                  class="input input-bordered w-full tabular-nums"
                  :value="activeFormPriceField === 'buyPrice' ? formPriceDraft : formatGrouped(form.buyPrice)"
                  @focus="onFormPriceFocus('buyPrice')"
                  @input="onFormPriceInput"
                  @blur="onFormPriceBlur('buyPrice')"
                />
              </label>
              <label class="form-control w-full sm:col-span-2 lg:col-span-1">
                <div class="label">
                  <span class="label-text font-medium">فروش (تومن / هر عدد)</span>
                </div>
                <input
                  type="text"
                  inputmode="numeric"
                  autocomplete="off"
                  class="input input-bordered w-full tabular-nums"
                  :value="activeFormPriceField === 'sellPrice' ? formPriceDraft : formatGrouped(form.sellPrice)"
                  @focus="onFormPriceFocus('sellPrice')"
                  @input="onFormPriceInput"
                  @blur="onFormPriceBlur('sellPrice')"
                />
              </label>
            </div>
          </fieldset>

          <div class="card-actions mt-4 justify-end">
            <button type="submit" class="btn btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              افزودن به لیست
            </button>
          </div>
        </form>

        <dialog id="jalali-date-modal" ref="dateDialogRef" class="modal">
          <div class="modal-box max-w-md">
            <h3 class="text-lg font-bold" dir="rtl">انتخاب تاریخ شمسی</h3>
            <p class="py-1 text-sm text-base-content/70" dir="rtl">روز را از تقویم انتخاب کنید.</p>
            <JalaliDatePicker
              compact
              :model-value="{ jy: form.jalaliY, jm: form.jalaliM, jd: form.jalaliD }"
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

    <div class="card border border-base-300 bg-base-100 shadow-xl">
      <div class="card-body gap-4">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="card-title m-0 text-xl">موجودی انبار</h2>
            <div class="flex flex-wrap gap-2">
              <div class="badge badge-lg badge-neutral tabular-nums">{{ materialCount }} کالا</div>
              <div class="badge badge-lg badge-ghost tabular-nums">{{ grandTotalUnits }} عدد</div>
            </div>
          </div>

          <div
            v-if="materials.length"
            class="stats stats-horizontal w-full rounded-box border border-base-300 bg-base-200 shadow sm:w-auto"
          >
            <div class="stat place-items-start px-4 py-3">
              <div class="stat-title text-xs opacity-70">ارزش به بهای تمام‌شده</div>
              <div class="stat-value text-lg font-semibold tabular-nums">{{ formatRial(totalBuyValue) }}</div>
            </div>
            <div class="stat place-items-start px-4 py-3">
              <div class="stat-title text-xs opacity-70">به قیمت فروش</div>
              <div class="stat-value text-lg font-semibold tabular-nums">{{ formatRial(totalSellValue) }}</div>
            </div>
          </div>
        </div>

        <div v-if="materials.length" class="alert alert-ghost py-2 text-sm">
          <span
            >روی ردیف کلیک کنید (خارج از فیلدها) تا تاریخچه خرید باز شود. با دستهٔ
            <strong>⋮⋮</strong>
            ردیف‌ها را بکشید تا ترتیب نمایش (اولویت) عوض شود. در سطر اصلی
            <strong>آخرین</strong> خرید دیده می‌شود؛ در بخش تاریخچه هر دور خرید را جدا ویرایش کنید.</span
          >
        </div>

        <div v-if="!materials.length" role="status" class="alert alert-info shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="h-6 w-6 shrink-0 stroke-current">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>هنوز کالایی نیست. با فرم بالا اولین کالا را اضافه کنید.</span>
        </div>

        <div v-else class="rounded-box border border-base-300">
          <div class="overflow-x-auto">
            <table class="table table-zebra table-pin-rows">
              <thead>
                <tr>
                  <th scope="col" class="w-10 text-center" title="ترتیب نمایش">⋮⋮</th>
                  <th scope="col" class="w-8"></th>
                  <th scope="col">کالا</th>
                  <th scope="col" class="whitespace-nowrap">
                    <span class="inline-flex flex-col items-start gap-0.5">
                      <span>تاریخ شمسی</span>
                      <span class="badge badge-ghost badge-xs">آخرین</span>
                    </span>
                  </th>
                  <th scope="col" class="text-end">
                    <span class="inline-flex flex-col items-end gap-0.5">
                      <span>تعداد</span>
                      <span class="badge badge-ghost badge-xs">جمع</span>
                    </span>
                  </th>
                  <th scope="col" class="text-end">
                    <span class="inline-flex flex-col items-end gap-0.5">
                      <span>خرید (هر عدد)</span>
                      <span class="badge badge-ghost badge-xs">آخرین</span>
                    </span>
                  </th>
                  <th scope="col" class="text-end">
                    <span class="inline-flex flex-col items-end gap-0.5">
                      <span>فروش (هر عدد)</span>
                      <span class="badge badge-ghost badge-xs">آخرین</span>
                    </span>
                  </th>
                  <th scope="col" class="text-end">جمع خرید</th>
                  <th scope="col" class="text-end">جمع فروش</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(m, idx) in materials" :key="m.id">
                  <tr
                    class="cursor-pointer transition-colors hover:bg-base-200/40"
                    :class="{
                      'opacity-60': dragInventoryMaterialId === m.id,
                      'bg-primary/10': dragOverInventoryIndex === idx && dragInventoryMaterialId !== m.id,
                    }"
                    @click="onMaterialRowClick(m, $event)"
                    @dragover="onInventoryDragOver($event, idx)"
                    @drop="onInventoryDrop($event, idx)"
                  >
                    <td class="w-10 text-center align-middle" @click.stop>
                      <span
                        data-drag-handle
                        draggable="true"
                        class="inline-flex cursor-grab select-none items-center justify-center rounded px-0.5 text-base-content/40 active:cursor-grabbing hover:bg-base-300/50 hover:text-base-content/70"
                        title="کشیدن برای تغییر ترتیب"
                        aria-label="کشیدن برای تغییر ترتیب"
                        @dragstart="onInventoryDragStart($event, m)"
                        @dragend="onInventoryDragEnd"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M9 4h2v2H9V4zm4 0h2v2h-2V4zM9 9h2v2H9V9zm4 0h2v2h-2V9zM9 14h2v2H9v-2zm4 0h2v2h-2v-2zM9 19h2v2H9v-2zm4 0h2v2h-2v-2z" />
                        </svg>
                      </span>
                    </td>
                    <td class="w-8 text-center text-base-content/50">
                      {{ expandedMaterialId === m.id ? '▼' : '▶' }}
                    </td>
                    <td @click.stop>
                      <input
                        class="input input-bordered input-sm w-full min-w-[8rem]"
                        :value="m.name"
                        @change="onNameChange(m.id, $event.target.value)"
                      />
                    </td>
                    <td class="whitespace-nowrap text-sm" dir="rtl" lang="fa">{{ rowJalaliDisplay(m) }}</td>
                    <td class="text-end">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        readonly
                        tabindex="-1"
                        title="جمع واحدها (همه خریدها). تعداد را در تاریخچه بازشده ویرایش کنید."
                        class="input input-bordered input-sm inline-block w-24 max-w-full cursor-default bg-base-200/40 text-end tabular-nums"
                        :value="totalUnits(m)"
                      />
                    </td>
                    <td class="text-end" @click.stop>
                      <input
                        type="text"
                        inputmode="numeric"
                        autocomplete="off"
                        class="input input-bordered input-sm inline-block w-28 max-w-full text-end tabular-nums"
                        :value="
                          activePriceKey === priceKeyLatest(m.id, 'buyPrice')
                            ? priceDraft
                            : formatGrouped(getLatestLot(m)?.buyPrice ?? 0)
                        "
                        @focus="onTablePriceFocus(priceKeyLatest(m.id, 'buyPrice'), getLatestLot(m)?.buyPrice ?? 0)"
                        @input="onTablePriceInput"
                        @blur="onTablePriceBlur"
                      />
                    </td>
                    <td class="text-end" @click.stop>
                      <input
                        type="text"
                        inputmode="numeric"
                        autocomplete="off"
                        class="input input-bordered input-sm inline-block w-28 max-w-full text-end tabular-nums"
                        :value="
                          activePriceKey === priceKeyLatest(m.id, 'sellPrice')
                            ? priceDraft
                            : formatGrouped(getLatestLot(m)?.sellPrice ?? 0)
                        "
                        @focus="onTablePriceFocus(priceKeyLatest(m.id, 'sellPrice'), getLatestLot(m)?.sellPrice ?? 0)"
                        @input="onTablePriceInput"
                        @blur="onTablePriceBlur"
                      />
                    </td>
                    <td class="text-end tabular-nums text-base-content/80">{{ formatRial(lineBuyTotal(m)) }}</td>
                    <td class="text-end tabular-nums text-base-content/80">{{ formatRial(lineSellTotal(m)) }}</td>
                  </tr>
                  <tr v-if="expandedMaterialId === m.id" class="bg-base-200/30 hover:bg-base-200/30">
                    <td colspan="9" class="p-0">
                      <div class="border-t border-base-300 p-4">
                        <div class="mb-2 flex flex-wrap items-center gap-2" dir="rtl">
                          <p class="text-sm font-semibold">تاریخچه خرید</p>
                          <span class="badge badge-secondary badge-sm badge-outline">ویرایش خریدهای قبلی</span>
                          <p class="w-full text-xs text-base-content/60 sm:w-auto">
                            در آرشیو، «تعداد کل» ثابت می‌ماند و فقط «باقی‌مانده» با فروش تغییر می‌کند.
                          </p>
                        </div>
                        <div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
                          <table class="table table-sm">
                            <thead>
                              <tr>
                                <th class="whitespace-nowrap" dir="rtl">تاریخ شمسی</th>
                                <th class="text-end">تعداد کل</th>
                                <th class="text-end">باقی‌مانده</th>
                                <th class="text-end">خرید (هر عدد)</th>
                                <th class="text-end">فروش (هر عدد)</th>
                                <th class="text-end">جمع خرید</th>
                                <th class="text-end">جمع فروش</th>
                                <th class="text-center whitespace-nowrap">ویرایش</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr
                                v-for="lot in sortedLotsNewestFirst(m)"
                                :key="lot.id"
                                :class="lot.count <= 0 ? 'bg-error/10 text-base-content/70' : ''"
                              >
                                <td class="whitespace-nowrap" dir="rtl" lang="fa">{{ rowLotJalaliDisplay(lot) }}</td>
                                <td class="text-end tabular-nums">{{ lot.initialCount ?? lot.count }}</td>
                                <td class="text-end tabular-nums">{{ lot.count }}</td>
                                <td class="text-end">
                                  <span class="tabular-nums">{{ formatGrouped(lot.buyPrice) }}</span>
                                </td>
                                <td class="text-end">
                                  <span class="tabular-nums">{{ formatGrouped(lot.sellPrice) }}</span>
                                </td>
                                <td class="text-end tabular-nums text-base-content/80">
                                  {{ formatRial(lot.count * lot.buyPrice) }}
                                </td>
                                <td class="text-end tabular-nums text-base-content/80">
                                  {{ formatRial(lot.count * lot.sellPrice) }}
                                </td>
                                <td class="text-center" @click.stop>
                                  <button
                                    type="button"
                                    class="btn btn-ghost btn-xs"
                                    aria-label="ویرایش این خرید"
                                    @click="openEditLot(m, lot)"
                                  >
                                    ویرایش
                                  </button>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>

        <dialog id="edit-lot-modal" ref="editLotDialogRef" class="modal" @close="onEditLotDialogClose">
          <div class="modal-box max-w-lg">
            <h3 class="text-lg font-bold" dir="rtl">ویرایش خرید</h3>
            <p class="py-1 text-sm text-base-content/70" dir="rtl">
              فقط همین ردیف انتخاب‌شده از تاریخچه ویرایش می‌شود.
            </p>

            <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label class="form-control">
                <div class="label py-1">
                  <span class="label-text font-medium" dir="rtl">باقی‌مانده</span>
                </div>
                <input
                  v-model.number="editForm.count"
                  type="number"
                  min="0"
                  step="1"
                  class="input input-bordered w-full tabular-nums text-end"
                />
              </label>
              <label class="form-control">
                <div class="label py-1">
                  <span class="label-text font-medium" dir="rtl">تاریخ شمسی</span>
                </div>
                <div class="join w-full">
                  <input
                    readonly
                    type="text"
                    class="input input-bordered join-item min-w-0 flex-1 cursor-pointer"
                    dir="rtl"
                    lang="fa"
                    :value="editJalaliDisplay"
                    aria-haspopup="dialog"
                    aria-controls="edit-lot-jalali-modal"
                    @click="openEditLotJalaliModal"
                  />
                  <button
                    type="button"
                    class="btn btn-square join-item shrink-0 border-base-300"
                    aria-label="تقویم"
                    @click="openEditLotJalaliModal"
                  >
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
              <label class="form-control">
                <div class="label py-1">
                  <span class="label-text font-medium" dir="rtl">خرید (تومن / هر عدد)</span>
                </div>
                <input
                  type="text"
                  inputmode="numeric"
                  autocomplete="off"
                  class="input input-bordered w-full tabular-nums"
                  :value="editActivePriceField === 'buyPrice' ? editPriceDraft : formatGrouped(editForm.buyPrice)"
                  @focus="onEditPriceFocus('buyPrice')"
                  @input="onEditPriceInput"
                  @blur="onEditPriceBlur('buyPrice')"
                />
              </label>
              <label class="form-control">
                <div class="label py-1">
                  <span class="label-text font-medium" dir="rtl">فروش (تومن / هر عدد)</span>
                </div>
                <input
                  type="text"
                  inputmode="numeric"
                  autocomplete="off"
                  class="input input-bordered w-full tabular-nums"
                  :value="editActivePriceField === 'sellPrice' ? editPriceDraft : formatGrouped(editForm.sellPrice)"
                  @focus="onEditPriceFocus('sellPrice')"
                  @input="onEditPriceInput"
                  @blur="onEditPriceBlur('sellPrice')"
                />
              </label>
            </div>

            <div class="modal-action">
              <form method="dialog">
                <button type="submit" class="btn btn-ghost">انصراف</button>
              </form>
              <button type="button" class="btn btn-primary" @click="saveEditLot">ذخیره</button>
            </div>
          </div>
          <form method="dialog" class="modal-backdrop">
            <button type="submit" aria-label="بستن"> </button>
          </form>
        </dialog>

        <dialog id="edit-lot-jalali-modal" ref="editLotJalaliDialogRef" class="modal">
          <div class="modal-box max-w-md">
            <h3 class="text-lg font-bold" dir="rtl">تاریخ شمسی</h3>
            <p class="py-1 text-sm text-base-content/70" dir="rtl">روز را از تقویم انتخاب کنید.</p>
            <JalaliDatePicker
              compact
              :model-value="{ jy: editForm.jalaliY, jm: editForm.jalaliM, jd: editForm.jalaliD }"
              @update:model-value="onEditLotJalaliPicked"
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

  </div>
</template>
