import { toJalaali, isValidJalaaliDate, jalaaliMonthLength } from 'jalaali-js'

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹'

function toPersianDigits(str) {
  return String(str).replace(/\d/g, (d) => FA_DIGITS[Number(d)] ?? d)
}

function pad2(n) {
  return String(Math.trunc(Number(n) || 0)).padStart(2, '0')
}

export function useJalali() {
  function todayJalali() {
    const { jy, jm, jd } = toJalaali(new Date())
    return { jy, jm, jd }
  }

  /** `1404/01/09` (Western digits). */
  function formatJalaliWestern(jy, jm, jd) {
    if (jy == null || jm == null || jd == null) return ''
    if (!isValidJalaaliDate(jy, jm, jd)) return ''
    return `${jy}/${pad2(jm)}/${pad2(jd)}`
  }

  /** `۱۴۰۴/۰۱/۰۹` (Persian digits). */
  function formatJalaliPersian(jy, jm, jd) {
    const w = formatJalaliWestern(jy, jm, jd)
    return w ? toPersianDigits(w) : ''
  }

  function daysInJalaliMonth(jy, jm) {
    if (!jy || !jm || jm < 1 || jm > 12) return 31
    return jalaaliMonthLength(jy, jm)
  }

  function isJalaliDateValid(jy, jm, jd) {
    return isValidJalaaliDate(Math.trunc(Number(jy)), Math.trunc(Number(jm)), Math.trunc(Number(jd)))
  }

  return {
    todayJalali,
    formatJalaliWestern,
    formatJalaliPersian,
    daysInJalaliMonth,
    isJalaliDateValid,
  }
}
