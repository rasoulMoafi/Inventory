const STORAGE_KEY = 'sigar-materials'

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

function loadFromStorage() {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function normalizeJalaliPart(v) {
  if (v === null || v === undefined || v === '') return null
  const n = Math.trunc(Number(v))
  return Number.isFinite(n) ? n : null
}

function normalizeLot(row) {
  const remaining = Math.max(0, Number(row.count) || 0)
  const hasInitial = row.initialCount !== null && row.initialCount !== undefined && row.initialCount !== ''
  const total = hasInitial ? Math.max(0, Number(row.initialCount) || 0) : remaining
  return {
    id: row.id ?? uid(),
    count: remaining,
    initialCount: total,
    buyPrice: Math.max(0, Number(row.buyPrice) || 0),
    sellPrice: Math.max(0, Number(row.sellPrice) || 0),
    jalaliY: normalizeJalaliPart(row.jalaliY),
    jalaliM: normalizeJalaliPart(row.jalaliM),
    jalaliD: normalizeJalaliPart(row.jalaliD),
  }
}

/** Lexicographic Jalali compare: negative if a < b. */
export function compareJalali(a, b) {
  if (a.jalaliY !== b.jalaliY) return (a.jalaliY || 0) - (b.jalaliY || 0)
  if (a.jalaliM !== b.jalaliM) return (a.jalaliM || 0) - (b.jalaliM || 0)
  return (a.jalaliD || 0) - (b.jalaliD || 0)
}

export function getLatestLot(material) {
  const lots = material?.lots
  if (!lots?.length) return null
  return [...lots].sort((x, y) => compareJalali(y, x))[0]
}

export function sortedLotsNewestFirst(material) {
  const lots = material?.lots
  if (!lots?.length) return []
  return [...lots].sort((x, y) => compareJalali(y, x))
}

export function totalUnits(material) {
  return material.lots.reduce((s, l) => s + l.count, 0)
}

export function lineBuyTotal(material) {
  return material.lots.reduce((s, l) => s + l.count * l.buyPrice, 0)
}

export function lineSellTotal(material) {
  return material.lots.reduce((s, l) => s + l.count * l.sellPrice, 0)
}

function migrateLegacyRow(row) {
  if (row.lots && Array.isArray(row.lots)) {
    return {
      id: row.id ?? uid(),
      name: String(row.name ?? '').trim() || 'بدون نام',
      lots: row.lots.map((l) => normalizeLot(l)),
    }
  }
  return {
    id: row.id ?? uid(),
    name: String(row.name ?? '').trim() || 'بدون نام',
    lots: [
      normalizeLot({
        id: uid(),
        count: row.count,
        buyPrice: row.buyPrice,
        sellPrice: row.sellPrice,
        jalaliY: row.jalaliY,
        jalaliM: row.jalaliM,
        jalaliD: row.jalaliD,
      }),
    ],
  }
}

export function useMaterials() {
  const materials = useState('sigar-materials', () => loadFromStorage().map(migrateLegacyRow))

  watch(
    materials,
    (list) => {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
    },
    { deep: true }
  )

  /**
   * Add a purchase lot. Either append to an existing material (materialId) or create a new one (name).
   */
  function addPurchase(payload) {
    const lot = normalizeLot({
      count: payload.count,
      initialCount: payload.count,
      buyPrice: payload.buyPrice,
      sellPrice: payload.sellPrice,
      jalaliY: payload.jalaliY,
      jalaliM: payload.jalaliM,
      jalaliD: payload.jalaliD,
    })

    if (payload.materialId) {
      const m = materials.value.find((x) => x.id === payload.materialId)
      if (m) {
        m.lots.push(lot)
        return
      }
    }

    materials.value.push({
      id: uid(),
      name: String(payload.name ?? '').trim() || 'بدون نام',
      lots: [lot],
    })
  }

  function renameMaterial(id, name) {
    const m = materials.value.find((x) => x.id === id)
    if (!m) return
    m.name = String(name ?? '').trim() || 'بدون نام'
  }

  function updateLatestLotField(materialId, field, rawValue) {
    const m = materials.value.find((x) => x.id === materialId)
    if (!m || !m.lots.length) return
    const latest = getLatestLot(m)
    if (!latest) return
    const numFields = ['count', 'buyPrice', 'sellPrice']
    if (numFields.includes(field)) {
      latest[field] = Math.max(0, Number(rawValue) || 0)
    }
  }

  function updateLotById(materialId, lotId, patch) {
    const m = materials.value.find((x) => x.id === materialId)
    if (!m) return
    const i = m.lots.findIndex((l) => l.id === lotId)
    if (i === -1) return
    m.lots[i] = normalizeLot({ ...m.lots[i], ...patch, id: lotId })
  }

  function removeMaterial(id) {
    materials.value = materials.value.filter((m) => m.id !== id)
  }

  /** Move one material row to a new index (order = display priority in inventory). */
  function reorderMaterials(fromIndex, toIndex) {
    const list = materials.value
    const n = list.length
    if (fromIndex === toIndex) return
    if (fromIndex < 0 || fromIndex >= n) return
    if (toIndex < 0 || toIndex >= n) return
    const [item] = list.splice(fromIndex, 1)
    list.splice(toIndex, 0, item)
  }

  /** Replace all materials from a backup file; normalizes rows and syncs localStorage via watch. */
  function replaceMaterialsFromBackup(rawList) {
    if (!Array.isArray(rawList)) return { ok: false, error: 'لیست کالا در فایل معتبر نیست.' }
    materials.value = rawList.map(migrateLegacyRow)
    return { ok: true }
  }

  /**
   * Remove quantity from oldest purchase lots first (FIFO). Mutates materials.
   * Returns total inventory buy cost (Toman) for the units removed.
   */
  function sellUnitsWithCost(materialId, quantity) {
    const q = Math.max(0, Number(quantity) || 0)
    if (q <= 0) return { ok: false, error: 'تعداد نامعتبر است' }
    const m = materials.value.find((x) => x.id === materialId)
    if (!m) return { ok: false, error: 'کالا یافت نشد' }
    const available = totalUnits(m)
    if (available < q) return { ok: false, error: 'موجودی کافی نیست' }

    let remaining = q
    let costTotal = 0
    const byOldest = [...m.lots].sort((a, b) => compareJalali(a, b))
    for (const lot of byOldest) {
      if (remaining <= 0) break
      const idx = m.lots.findIndex((l) => l.id === lot.id)
      if (idx === -1) continue
      const current = m.lots[idx]
      const take = Math.min(current.count, remaining)
      costTotal += take * (Number(current.buyPrice) || 0)
      m.lots[idx] = normalizeLot({
        ...current,
        count: current.count - take,
        id: current.id,
      })
      remaining -= take
    }
    return { ok: true, costTotal }
  }

  function sellUnits(materialId, quantity) {
    const r = sellUnitsWithCost(materialId, quantity)
    if (!r.ok) return r
    return { ok: true }
  }

  /**
   * Put sale lines back into inventory (one new lot per line, dated with the factor’s Jalali date).
   * Buy price per unit = lineCostBuy / count when cost was stored; otherwise 0. Sell price uses the line’s unitPrice.
   */
  function restoreInventoryFromSale(sale) {
    const lines = sale?.lines ?? []
    for (const line of lines) {
      const m = materials.value.find((x) => x.id === line.materialId)
      if (!m) {
        return {
          ok: false,
          error: `بازگردانی موجودی ممکن نیست: «${line.materialName}» در انبار نیست. ابتدا آن کالا را دوباره اضافه کنید.`,
        }
      }
      const c = Math.max(0, Number(line.count) || 0)
      if (c <= 0) continue
      const rawCost = line.lineCostBuy
      const cost =
        rawCost != null && rawCost !== '' ? Math.max(0, Number(rawCost) || 0) : null
      const buyPU = cost != null && c > 0 ? Math.round(cost / c) : 0
      const sellPU = Math.max(0, Number(line.unitPrice) || 0)
      m.lots.push(
        normalizeLot({
          id: uid(),
          count: c,
          initialCount: c,
          buyPrice: buyPU,
          sellPrice: sellPU > 0 ? sellPU : buyPU,
          jalaliY: sale.jalaliY,
          jalaliM: sale.jalaliM,
          jalaliD: sale.jalaliD,
        })
      )
    }
    return { ok: true }
  }

  return {
    materials,
    addPurchase,
    renameMaterial,
    updateLatestLotField,
    updateLotById,
    removeMaterial,
    reorderMaterials,
    replaceMaterialsFromBackup,
    sellUnits,
    sellUnitsWithCost,
    restoreInventoryFromSale,
  }
}
