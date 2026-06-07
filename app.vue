<script setup>
const isDark = ref(false)

const { materials } = useMaterials()
const { formatGrouped } = useRialInput()
const { todayJalali, formatJalaliPersian } = useJalali()

const { exportToTextFile, importFromTextFile } = useAppDataBackup()
const importInputRef = ref(null)
const exportDialogRef = ref(null)
const exportBasename = ref('sigar-backup')
const backupMessage = ref('')
const backupVariant = ref('info')

const sharePricesDialogRef = ref(null)
const sharePricesText = ref('')
const sharePricesCopied = ref(false)

const shareBuyPricesDialogRef = ref(null)
const shareBuyPricesText = ref('')
const shareBuyPricesCopied = ref(false)

/** Gap between name (left) and price (right) in pasted text / monospace preview */
const SHARE_PRICE_NAME_GAP = '          '

function buildPricesShareHeader(title) {
  const { jy, jm, jd } = todayJalali()
  const dateStr = formatJalaliPersian(jy, jm, jd)
  return `بنام خدا

⚜️${title} ⚜️
🔻لیست مورخه
${dateStr}`
}

function buildPricesShareText(priceField) {
  const title = priceField === 'buyPrice' ? 'قیمت خرید محصولات' : 'قیمت روز محصولات'
  const header = buildPricesShareHeader(title)
  const lines = []
  for (const m of materials.value) {
    const lot = getLatestLot(m)
    const price = lot?.[priceField] ?? 0
    lines.push(`${m.name}${SHARE_PRICE_NAME_GAP}${formatGrouped(price)}`)
  }
  return `${header}\n\n${lines.join('\n')}`
}

async function openSharePricesDialog() {
  backupMessage.value = ''
  sharePricesCopied.value = false
  if (!materials.value.length) {
    backupMessage.value = 'لیست انبار خالی است؛ ابتدا از صفحهٔ انبار کالا اضافه کنید.'
    backupVariant.value = 'error'
    return
  }
  sharePricesText.value = buildPricesShareText('sellPrice')
  sharePricesDialogRef.value?.showModal()
  try {
    await navigator.clipboard.writeText(sharePricesText.value)
    sharePricesCopied.value = true
  } catch {
    sharePricesCopied.value = false
  }
}

async function copySharePricesAgain() {
  try {
    await navigator.clipboard.writeText(sharePricesText.value)
    sharePricesCopied.value = true
  } catch {
    sharePricesCopied.value = false
  }
}

async function openShareBuyPricesDialog() {
  backupMessage.value = ''
  shareBuyPricesCopied.value = false
  if (!materials.value.length) {
    backupMessage.value = 'لیست انبار خالی است؛ ابتدا از صفحهٔ انبار کالا اضافه کنید.'
    backupVariant.value = 'error'
    return
  }
  shareBuyPricesText.value = buildPricesShareText('buyPrice')
  shareBuyPricesDialogRef.value?.showModal()
  try {
    await navigator.clipboard.writeText(shareBuyPricesText.value)
    shareBuyPricesCopied.value = true
  } catch {
    shareBuyPricesCopied.value = false
  }
}

async function copyShareBuyPricesAgain() {
  try {
    await navigator.clipboard.writeText(shareBuyPricesText.value)
    shareBuyPricesCopied.value = true
  } catch {
    shareBuyPricesCopied.value = false
  }
}

onMounted(() => {
  isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
})

const theme = computed(() => (isDark.value ? 'dark' : 'corporate'))

const dailyFactorsDialogRef = ref(null)
function openDailyFactorsDialog() {
  dailyFactorsDialogRef.value?.open()
}

function openExportDialog() {
  backupMessage.value = ''
  exportBasename.value = 'sigar-backup'
  exportDialogRef.value?.showModal()
}

function confirmExportDownload() {
  exportToTextFile(exportBasename.value)
  exportDialogRef.value?.close()
  backupMessage.value = 'فایل متنی پشتیبان دانلود شد (انبار + مشتریان).'
  backupVariant.value = 'success'
}

function openImportPicker() {
  backupMessage.value = ''
  importInputRef.value?.click()
}

async function onImportBackupFile(e) {
  const input = e.target
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  const ok = window.confirm(
    'همهٔ داده‌های فعلی انبار و مشتریان با محتوای این فایل جایگزین شود؟ این کار برگشت‌پذیر نیست.'
  )
  if (!ok) return

  const r = await importFromTextFile(file)
  if (!r.ok) {
    backupMessage.value = r.error || 'وارد کردن انجام نشد.'
    backupVariant.value = 'error'
    return
  }
  backupMessage.value = 'داده‌ها وارد شد و با حافظهٔ محلی (localStorage) همگام شد.'
  backupVariant.value = 'success'
}
</script>

<template>
  <div dir="rtl" lang="fa" :data-theme="theme" class="flex min-h-screen flex-col bg-base-200 text-base-content">
    <header class="navbar border-b border-base-300 bg-base-100 px-2 shadow-sm sm:px-4">
      <div class="navbar-start gap-2">
        <div class="dropdown lg:hidden">
          <div tabindex="0" role="button" class="btn btn-ghost btn-circle" aria-label="منو">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </div>
          <ul tabindex="0" class="menu dropdown-content z-[1] mt-3 w-52 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg">
            <li>
              <NuxtLink to="/" :class="{ active: $route.path === '/' }">انبار</NuxtLink>
            </li>
            <li>
              <NuxtLink to="/customers" :class="{ active: $route.path.startsWith('/customers') }">مشتریان</NuxtLink>
            </li>
            <li>
              <button type="button" class="whitespace-nowrap text-start" @click="openDailyFactorsDialog">گزارش روز</button>
            </li>
          </ul>
        </div>
        <NuxtLink to="/" class="btn btn-ghost text-lg font-semibold normal-case">
          <span class="badge badge-primary badge-lg">SIGAR</span>
          <span class="hidden sm:inline">انبار</span>
        </NuxtLink>
      </div>

      <div class="navbar-center hidden lg:flex">
        <ul class="menu menu-horizontal rounded-box bg-base-200 px-1">
          <li>
            <NuxtLink
              to="/"
              class="font-medium"
              :class="{ active: $route.path === '/' }"
            >
              انبار
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              to="/customers"
              class="font-medium"
              :class="{ active: $route.path.startsWith('/customers') }"
            >
              مشتریان
            </NuxtLink>
          </li>
        </ul>
      </div>

      <div class="navbar-end gap-2">
        <button type="button" class="btn btn-ghost btn-sm gap-1" title="خرید و فروش به تفکیک روز" @click="openDailyFactorsDialog">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span class="hidden sm:inline">گزارش روز</span>
        </button>
        <div class="tooltip tooltip-bottom hidden sm:block" data-tip="فقط در این مرورگر ذخیره می‌شود">
          <span class="badge badge-outline gap-1">حافظهٔ محلی</span>
        </div>
        <label class="swap swap-rotate btn btn-ghost btn-circle" title="تم روشن / تیره">
          <input v-model="isDark" type="checkbox" />
          <svg class="swap-on h-6 w-6 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path
              d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,0,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z"
            />
          </svg>
          <svg class="swap-off h-6 w-6 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path
              d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z"
            />
          </svg>
        </label>
      </div>
    </header>

    <main class="flex-1">
      <NuxtPage />
    </main>

    <DailyFactorsDialog ref="dailyFactorsDialogRef" />

    <footer class="footer footer-center border-t border-base-300 bg-base-100 p-6 text-base-content">
      <aside class="max-w-lg space-y-3">
        <p class="font-semibold">SIGAR · مدیریت انبار کالا</p>
        <p class="text-sm opacity-70">قیمت‌ها به تومن · داده‌ها فقط روی دستگاه شما می‌ماند</p>
        <div class="flex flex-wrap justify-center gap-2">
          <button type="button" class="btn btn-outline btn-sm gap-1" @click="openExportDialog">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            خروجی به فایل متنی
          </button>
          <button type="button" class="btn btn-outline btn-sm gap-1" @click="openImportPicker">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-8-9l-4-4m0 0L6 8m4-4v12"
              />
            </svg>
            ورود از فایل
          </button>
          <button type="button" class="btn btn-outline btn-sm gap-1" title="نام کالا و قیمت فروش (آخرین خرید) برای چسباندن در پیام‌رسان" @click="openSharePricesDialog">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            متن برای پیام‌رسان
          </button>
          <button type="button" class="btn btn-outline btn-sm gap-1" title="نام کالا و قیمت خرید (آخرین خرید) برای چسباندن در پیام‌رسان" @click="openShareBuyPricesDialog">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            قیمت خرید
          </button>
          <input
            ref="importInputRef"
            type="file"
            class="hidden"
            accept=".txt,.json,text/plain,application/json"
            @change="onImportBackupFile"
          />
        </div>
        <div
          v-if="backupMessage"
          role="status"
          class="rounded-box border px-3 py-2 text-sm"
          :class="{
            'border-success/40 bg-success/10 text-success': backupVariant === 'success',
            'border-error/40 bg-error/10 text-error': backupVariant === 'error',
            'border-info/40 bg-info/10 text-info': backupVariant === 'info',
          }"
        >
          {{ backupMessage }}
        </div>
        <div class="flex flex-wrap justify-center gap-2">
          <div class="badge badge-ghost badge-sm">Nuxt</div>
          <div class="badge badge-ghost badge-sm">DaisyUI</div>
          <div class="badge badge-ghost badge-sm">Vue</div>
        </div>
      </aside>
    </footer>

    <dialog ref="sharePricesDialogRef" id="share-prices-modal" class="modal">
      <div class="modal-box max-w-lg">
        <h3 class="text-lg font-bold" dir="rtl">نام کالا و قیمت فروش</h3>
        <p class="py-1 text-sm text-base-content/70" dir="rtl">
          هر خط پایین‌تر: ابتدا نام کالا، سپس با فاصله، قیمت فروش هر عدد (همان «آخرین» در جدول انبار). بالای لیست، عنوان و تاریخ امروز (شمسی) می‌آید. بدون نوشتن «تومن».
        </p>
        <p v-if="sharePricesCopied" class="text-sm text-success" dir="rtl">در حافظه کپی شد.</p>
        <p v-else class="text-sm text-warning" dir="rtl">اگر کپی نشد، متن را انتخاب کنید یا دکمهٔ زیر را بزنید.</p>
        <textarea
          readonly
          dir="ltr"
          lang="fa"
          rows="12"
          class="textarea textarea-bordered mt-2 w-full font-mono text-sm leading-relaxed"
          :value="sharePricesText"
        ></textarea>
        <div class="modal-action flex-wrap gap-2">
          <button type="button" class="btn btn-outline btn-sm" @click="copySharePricesAgain">کپی دوباره</button>
          <form method="dialog">
            <button type="submit" class="btn btn-primary">بستن</button>
          </form>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button type="submit" aria-label="بستن"> </button>
      </form>
    </dialog>

    <dialog ref="shareBuyPricesDialogRef" id="share-buy-prices-modal" class="modal">
      <div class="modal-box max-w-lg">
        <h3 class="text-lg font-bold" dir="rtl">نام کالا و قیمت خرید</h3>
        <p class="py-1 text-sm text-base-content/70" dir="rtl">
          هر خط پایین‌تر: ابتدا نام کالا، سپس با فاصله، قیمت خرید هر عدد (همان «آخرین» در جدول انبار). بالای لیست، عنوان و تاریخ امروز (شمسی) می‌آید. بدون نوشتن «تومن».
        </p>
        <p v-if="shareBuyPricesCopied" class="text-sm text-success" dir="rtl">در حافظه کپی شد.</p>
        <p v-else class="text-sm text-warning" dir="rtl">اگر کپی نشد، متن را انتخاب کنید یا دکمهٔ زیر را بزنید.</p>
        <textarea
          readonly
          dir="ltr"
          lang="fa"
          rows="12"
          class="textarea textarea-bordered mt-2 w-full font-mono text-sm leading-relaxed"
          :value="shareBuyPricesText"
        ></textarea>
        <div class="modal-action flex-wrap gap-2">
          <button type="button" class="btn btn-outline btn-sm" @click="copyShareBuyPricesAgain">کپی دوباره</button>
          <form method="dialog">
            <button type="submit" class="btn btn-primary">بستن</button>
          </form>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button type="submit" aria-label="بستن"> </button>
      </form>
    </dialog>

    <dialog ref="exportDialogRef" id="export-backup-modal" class="modal">
      <div class="modal-box max-w-md">
        <h3 class="text-lg font-bold" dir="rtl">نام فایل خروجی</h3>
        <p class="py-1 text-sm text-base-content/70" dir="rtl">
          فقط نام فایل (بدون مسیر). اگر خالی باشد، نام با تاریخ خودکار ساخته می‌شود. پسوند
          <span dir="ltr" class="font-mono">.txt</span>
          همیشه اضافه می‌شود.
        </p>
        <label class="form-control w-full">
          <span class="label-text text-sm" dir="rtl">نام</span>
          <input
            v-model="exportBasename"
            type="text"
            class="input input-bordered w-full font-mono"
            dir="ltr"
            autocomplete="off"
            placeholder="sigar-backup"
          />
        </label>
        <div class="modal-action">
          <form method="dialog">
            <button type="submit" class="btn btn-ghost">انصراف</button>
          </form>
          <button type="button" class="btn btn-primary" @click="confirmExportDownload">دانلود</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button type="submit" aria-label="بستن"> </button>
      </form>
    </dialog>
  </div>
</template>
