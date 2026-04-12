const BACKUP_FORMAT = 'sigar-backup'
const BACKUP_VERSION = 1

function sanitizeExportBasename(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return null
  let base = s
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/^[\-.]+|[\-.]+$/g, '')
  if (!base) return null
  if (base.length > 120) base = base.slice(0, 120)
  if (base.toLowerCase().endsWith('.txt')) base = base.slice(0, -4)
  return base || null
}

function downloadTextFile(filename, content) {
  if (typeof document === 'undefined') return
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function useAppDataBackup() {
  const { materials, replaceMaterialsFromBackup } = useMaterials()
  const { customers, replaceCustomersFromBackup } = useCustomers()

  function buildExportPayload() {
    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      materials: materials.value,
      customers: customers.value,
    }
  }

  /**
   * @param {string} [preferredBasename] نام بدون مسیر؛ اگر خالی باشد نام با تاریخ ساخته می‌شود. پسوند .txt اضافه می‌شود.
   */
  function exportToTextFile(preferredBasename) {
    const payload = buildExportPayload()
    const text = JSON.stringify(payload, null, 2)
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const raw = preferredBasename == null ? '' : String(preferredBasename).trim()
    const base = raw ? sanitizeExportBasename(raw) : null
    const finalBase = base || `sigar-backup-${stamp}`
    downloadTextFile(`${finalBase}.txt`, text)
  }

  function parseBackupJson(text) {
    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {
      return { ok: false, error: 'محتوای فایل JSON معتبر نیست.' }
    }

    let mats
    let custs

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const loose =
        Array.isArray(parsed.materials) &&
        Array.isArray(parsed.customers) &&
        parsed.format == null
      if (parsed.format === BACKUP_FORMAT) {
        if (parsed.version != null && typeof parsed.version === 'number' && parsed.version > BACKUP_VERSION) {
          return { ok: false, error: 'نسخهٔ این پشتیبان با برنامه سازگار نیست. برنامه را به‌روز کنید.' }
        }
        mats = parsed.materials
        custs = parsed.customers
      } else if (loose) {
        mats = parsed.materials
        custs = parsed.customers
      } else {
        return { ok: false, error: 'ساختار فایل شناخته نشد. از خروجی همین برنامه استفاده کنید.' }
      }
    } else {
      return { ok: false, error: 'ساختار فایل شناخته نشد. از خروجی همین برنامه استفاده کنید.' }
    }

    if (mats != null && !Array.isArray(mats)) {
      return { ok: false, error: 'فیلد materials در فایل باید آرایه باشد.' }
    }
    if (custs != null && !Array.isArray(custs)) {
      return { ok: false, error: 'فیلد customers در فایل باید آرایه باشد.' }
    }

    return { ok: true, materials: mats ?? [], customers: custs ?? [] }
  }

  async function importFromTextFile(file) {
    if (!file) return { ok: false, error: 'فایلی انتخاب نشده است.' }
    const text = await file.text()
    const parsed = parseBackupJson(text)
    if (!parsed.ok) return parsed

    const r1 = replaceMaterialsFromBackup(parsed.materials)
    if (!r1.ok) return r1
    const r2 = replaceCustomersFromBackup(parsed.customers)
    if (!r2.ok) return r2
    return { ok: true }
  }

  return {
    exportToTextFile,
    importFromTextFile,
    buildExportPayload,
  }
}
