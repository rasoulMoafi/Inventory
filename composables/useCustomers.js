import { compareJalali, totalUnits } from './useMaterials'

const STORAGE_KEY = 'sigar-customers'
const LEGACY_STORAGE_KEY = 'sigar-markets'

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

function loadFromStorage() {
  try {
    if (typeof localStorage === 'undefined') return []
    const next = localStorage.getItem(STORAGE_KEY)
    if (next) {
      const parsed = JSON.parse(next)
      return Array.isArray(parsed) ? parsed : []
    }
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacy) {
      const parsed = JSON.parse(legacy)
      return Array.isArray(parsed) ? parsed : []
    }
    return []
  } catch {
    return []
  }
}

function normalizeJalaliPart(v) {
  if (v === null || v === undefined || v === '') return null
  const n = Math.trunc(Number(v))
  return Number.isFinite(n) ? n : null
}

function normalizeSaleLine(row) {
  const count = Math.max(0, Number(row.count) || 0)
  let unitPrice = Math.max(0, Number(row.unitPrice) || 0)
  if (unitPrice === 0 && row.totalPrice != null && count > 0) {
    unitPrice = Math.round(Number(row.totalPrice) / count)
  }
  const base = {
    id: row.id ?? uid(),
    materialId: String(row.materialId ?? ''),
    materialName: String(row.materialName ?? '').trim() || 'نامشخص',
    count,
    unitPrice,
  }
  if (row.lineCostBuy != null && row.lineCostBuy !== '') {
    base.lineCostBuy = Math.max(0, Number(row.lineCostBuy) || 0)
  }
  return base
}

function normalizeSale(row) {
  return {
    id: row.id ?? uid(),
    jalaliY: normalizeJalaliPart(row.jalaliY),
    jalaliM: normalizeJalaliPart(row.jalaliM),
    jalaliD: normalizeJalaliPart(row.jalaliD),
    createdAt: Number(row.createdAt) || Date.now(),
    debt: Math.max(0, Number(row.debt) || 0),
    lines: Array.isArray(row.lines) ? row.lines.map((l) => normalizeSaleLine(l)) : [],
  }
}

function normalizeCustomer(row) {
  const base = {
    id: row.id ?? uid(),
    name: String(row.name ?? '').trim() || 'بدون نام',
    sales: [],
  }

  if (Array.isArray(row.sales) && row.sales.length) {
    base.sales = row.sales.map((s) => normalizeSale(s))
    return base
  }

  if (Array.isArray(row.lines) && row.lines.length) {
    for (const l of row.lines) {
      const nl = normalizeSaleLine(l)
      base.sales.push(
        normalizeSale({
          id: uid(),
          jalaliY: l.jalaliY,
          jalaliM: l.jalaliM,
          jalaliD: l.jalaliD,
          createdAt: Date.now(),
          lines: [nl],
        })
      )
    }
  }

  return base
}

export function saleLineTotal(line) {
  return (line.count || 0) * (line.unitPrice || 0)
}

export function saleGrandTotal(sale) {
  return (sale?.lines ?? []).reduce((s, l) => s + saleLineTotal(l), 0)
}

/** Newest Jalali date first; same day newest createdAt first. */
export function sortedCustomerSales(customer) {
  const sales = customer?.sales ?? []
  return [...sales].sort((a, b) => {
    const c = compareJalali(
      { jalaliY: b.jalaliY, jalaliM: b.jalaliM, jalaliD: b.jalaliD },
      { jalaliY: a.jalaliY, jalaliM: a.jalaliM, jalaliD: a.jalaliD }
    )
    if (c !== 0) return c
    return (b.createdAt || 0) - (a.createdAt || 0)
  })
}

export function customerFactorCount(customer) {
  return customer?.sales?.length ?? 0
}

export function customerTotalSoldRial(customer) {
  return (customer?.sales ?? []).reduce((s, sale) => s + saleGrandTotal(sale), 0)
}

/** FIFO inventory buy cost stored on the line (Toman), or null for older records. */
export function saleLineBuyCost(line) {
  if (line?.lineCostBuy == null) return null
  return Math.max(0, Number(line.lineCostBuy) || 0)
}

/** Revenue minus FIFO buy cost; null if cost was not recorded. */
export function saleLineProfit(line) {
  const cost = saleLineBuyCost(line)
  if (cost === null) return null
  return saleLineTotal(line) - cost
}

export function saleRevenue(sale) {
  return saleGrandTotal(sale)
}

export function saleDebt(sale) {
  return Math.max(0, Number(sale?.debt) || 0)
}

/** True when every line has FIFO buy cost on file. */
export function saleHasFullCostData(sale) {
  for (const l of sale?.lines ?? []) {
    if (saleLineBuyCost(l) === null) return false
  }
  return (sale?.lines ?? []).length > 0
}

export function saleInventoryBuyCost(sale) {
  if (!saleHasFullCostData(sale)) return null
  return (sale.lines ?? []).reduce((s, l) => s + (saleLineBuyCost(l) || 0), 0)
}

/**
 * Profit for one factor: customer revenue minus FIFO inventory buy cost.
 * Returns null if any line is missing stored cost (older sales).
 */
export function saleProfit(sale) {
  const revenue = saleRevenue(sale)
  const cost = saleInventoryBuyCost(sale)
  if (cost === null) return null
  return revenue - cost
}

/**
 * Aggregates across all factors. `profit` sums only factors with full cost data.
 * `hasIncomplete` is true if any factor is missing line costs.
 */
export function customerProfitSummary(customer) {
  let profit = 0
  let hasIncomplete = false
  for (const s of customer?.sales ?? []) {
    if (!saleHasFullCostData(s)) {
      hasIncomplete = true
      continue
    }
    const p = saleProfit(s)
    if (p != null) profit += p
  }
  return { profit, hasIncomplete }
}

export function customerDebtTotal(customer) {
  return (customer?.sales ?? []).reduce((sum, sale) => sum + saleDebt(sale), 0)
}

export function useCustomers() {
  const { materials, sellUnitsWithCost, restoreInventoryFromSale } = useMaterials()

  const customers = useState('sigar-customers', () => loadFromStorage().map(normalizeCustomer))

  watch(
    customers,
    (list) => {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
      try {
        localStorage.removeItem(LEGACY_STORAGE_KEY)
      } catch {
        /* ignore */
      }
    },
    { deep: true }
  )

  function addCustomer(name) {
    const c = normalizeCustomer({ id: uid(), name, sales: [] })
    customers.value.push(c)
    return c.id
  }

  function removeCustomer(id) {
    customers.value = customers.value.filter((x) => x.id !== id)
  }

  /**
   * One factor: multiple lines (material, count, unit sell price). Deducts stock FIFO per line.
   */
  function addFactorSale(payload) {
    const customer = customers.value.find((x) => x.id === payload.customerId)
    if (!customer) return { ok: false, error: 'مشتری یافت نشد' }

    const jy = Math.trunc(Number(payload.jalaliY))
    const jm = Math.trunc(Number(payload.jalaliM))
    const jd = Math.trunc(Number(payload.jalaliD))

    const raw = Array.isArray(payload.lines) ? payload.lines : []
    const lines = raw
      .map((l) => ({
        materialId: String(l.materialId ?? '').trim(),
        count: Math.max(0, Number(l.count) || 0),
        unitPrice: Math.max(0, Number(l.unitPrice) || 0),
      }))
      .filter((l) => l.materialId && l.count > 0)

    if (!lines.length) return { ok: false, error: 'حداقل یک ردیف با کالا و تعداد اضافه کنید.' }

    const need = new Map()
    for (const l of lines) {
      need.set(l.materialId, (need.get(l.materialId) || 0) + l.count)
    }

    for (const [mid, qty] of need) {
      const m = materials.value.find((x) => x.id === mid)
      if (!m) return { ok: false, error: 'این کالا در انبار نیست' }
      if (totalUnits(m) < qty) return { ok: false, error: `موجودی کافی برای «${m.name}» نیست` }
    }

    const saleLines = []
    for (const l of lines) {
      const sold = sellUnitsWithCost(l.materialId, l.count)
      if (!sold.ok) return sold
      const mat = materials.value.find((x) => x.id === l.materialId)
      saleLines.push(
        normalizeSaleLine({
          materialId: l.materialId,
          materialName: mat?.name ?? 'نامشخص',
          count: l.count,
          unitPrice: l.unitPrice,
          lineCostBuy: sold.costTotal,
        })
      )
    }

    customer.sales.push(
      normalizeSale({
        id: uid(),
        jalaliY: jy,
        jalaliM: jm,
        jalaliD: jd,
        createdAt: Date.now(),
        lines: saleLines,
      })
    )

    return { ok: true }
  }

  function getCustomer(id) {
    return customers.value.find((x) => x.id === id) ?? null
  }

  function removeCustomerSale(customerId, saleId) {
    const customer = customers.value.find((x) => x.id === customerId)
    if (!customer) return { ok: false, error: 'مشتری یافت نشد' }
    const idx = customer.sales.findIndex((s) => s.id === saleId)
    if (idx === -1) return { ok: false, error: 'فاکتور یافت نشد' }
    const sale = customer.sales[idx]
    const restored = restoreInventoryFromSale(sale)
    if (!restored.ok) return restored
    customer.sales.splice(idx, 1)
    return { ok: true }
  }

  function updateCustomerSaleDebt(customerId, saleId, debt) {
    const customer = customers.value.find((x) => x.id === customerId)
    if (!customer) return { ok: false, error: 'مشتری یافت نشد' }
    const sale = customer.sales.find((s) => s.id === saleId)
    if (!sale) return { ok: false, error: 'فاکتور یافت نشد' }
    sale.debt = Math.max(0, Number(debt) || 0)
    return { ok: true }
  }

  /** Replace all customers from a backup file; normalizes rows and syncs localStorage via watch. */
  function replaceCustomersFromBackup(rawList) {
    if (!Array.isArray(rawList)) return { ok: false, error: 'لیست مشتریان در فایل معتبر نیست.' }
    customers.value = rawList.map(normalizeCustomer)
    return { ok: true }
  }

  return {
    customers,
    addCustomer,
    removeCustomer,
    addFactorSale,
    getCustomer,
    removeCustomerSale,
    updateCustomerSaleDebt,
    replaceCustomersFromBackup,
  }
}
