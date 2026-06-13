/** Normalize Persian/Arabic text for consistent search across OS and keyboards. */
export function normalizeSearchText(text) {
  return String(text ?? '')
    .normalize('NFC')
    .replace(/[\u064A\u0649]/g, '\u06CC')
    .replace(/\u0643/g, '\u06A9')
    .replace(/[\u0622\u0623\u0625\u0624]/g, '\u0627')
    .replace(/\u0629/g, '\u0647')
    .replace(/[\u06F0-\u06F9]/g, (ch) => String(ch.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (ch) => String(ch.charCodeAt(0) - 0x0660))
    .replace(/[\u200C\u200D\u0640]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('en-US')
}

export function searchTextIncludes(haystack, needle) {
  const q = normalizeSearchText(needle)
  if (!q) return true
  return normalizeSearchText(haystack).includes(q)
}
