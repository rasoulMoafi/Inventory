/** Shared Toman grouping for price inputs (thousands separators). */
export function useRialInput() {
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
        /* detached */
      }
    })
  }

  return {
    formatRial,
    formatGrouped,
    parseRialDigits,
    onGroupedPriceInput,
  }
}
