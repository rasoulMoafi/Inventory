import { compareJalali } from './useMaterials'
import {
  saleProfit,
  saleGrandTotal,
  saleInventoryBuyCost,
  saleHasFullCostData,
} from './useCustomers'

export function sameJalaliDay(entity, jy, jm, jd) {
  return (
    entity?.jalaliY === jy &&
    entity?.jalaliM === jm &&
    entity?.jalaliD === jd
  )
}

function jalaliPoint(y, m, d) {
  return { jalaliY: y, jalaliM: m, jalaliD: d }
}

/** Inclusive range; if from > to, treats as swapped. */
export function jalaliInClosedRange(entity, from, to) {
  const p = jalaliPoint(entity.jalaliY, entity.jalaliM, entity.jalaliD)
  const a = jalaliPoint(from.jy, from.jm, from.jd)
  const b = jalaliPoint(to.jy, to.jm, to.jd)
  let lo = a
  let hi = b
  if (compareJalali(a, b) > 0) {
    lo = b
    hi = a
  }
  return compareJalali(p, lo) >= 0 && compareJalali(hi, p) >= 0
}

function pushBuyRow(rows, m, lot) {
  const qty =
    lot.initialCount != null && lot.initialCount !== ''
      ? Math.max(0, Number(lot.initialCount) || 0)
      : Math.max(0, Number(lot.count) || 0)
  rows.push({
    materialId: m.id,
    materialName: m.name,
    lot,
    qty,
    lineBuy: qty * (Number(lot.buyPrice) || 0),
  })
}

/** Lots whose purchase date falls in [from, to] (Jalali, inclusive). */
export function collectBuyLotsInRange(materials, from, to) {
  const rows = []
  for (const m of materials) {
    for (const lot of m.lots ?? []) {
      if (jalaliInClosedRange(lot, from, to)) {
        pushBuyRow(rows, m, lot)
      }
    }
  }
  rows.sort((x, y) => {
    const c = compareJalali(
      jalaliPoint(x.lot.jalaliY, x.lot.jalaliM, x.lot.jalaliD),
      jalaliPoint(y.lot.jalaliY, y.lot.jalaliM, y.lot.jalaliD)
    )
    if (c !== 0) return c
    return String(x.materialName).localeCompare(String(y.materialName), 'fa')
  })
  return rows
}

export function collectBuyLotsForDay(materials, jy, jm, jd) {
  return collectBuyLotsInRange(materials, { jy, jm, jd }, { jy, jm, jd })
}

/** Sales whose factor date falls in [from, to] (Jalali, inclusive). */
export function collectSalesInRange(customers, from, to) {
  const rows = []
  for (const c of customers) {
    for (const sale of c.sales ?? []) {
      if (jalaliInClosedRange(sale, from, to)) {
        rows.push({
          customerId: c.id,
          customerName: c.name,
          sale,
          profit: saleProfit(sale),
          revenue: saleGrandTotal(sale),
          cost: saleInventoryBuyCost(sale),
          hasFullCost: saleHasFullCostData(sale),
        })
      }
    }
  }
  rows.sort((a, b) => (b.sale.createdAt || 0) - (a.sale.createdAt || 0))
  return rows
}

export function collectSalesForDay(customers, jy, jm, jd) {
  return collectSalesInRange(customers, { jy, jm, jd }, { jy, jm, jd })
}

export function sumSellProfitForDay(rows) {
  return rows.reduce((s, r) => {
    if (r.profit == null) return s
    return s + r.profit
  }, 0)
}

export function sumBuyLotsTotal(rows) {
  return rows.reduce((s, r) => s + r.lineBuy, 0)
}
