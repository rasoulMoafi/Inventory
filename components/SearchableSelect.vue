<script setup>
const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: '',
  },
  options: {
    type: Array,
    default: () => [],
  },
  placeholder: {
    type: String,
    default: 'انتخاب…',
  },
  searchPlaceholder: {
    type: String,
    default: 'جستجو…',
  },
  required: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md'].includes(v),
  },
})

const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const query = ref('')
const rootRef = ref(null)
const searchRef = ref(null)
let removeOutsideListener = null

const selectedLabel = computed(() => {
  const opt = props.options.find((o) => o.value === props.modelValue)
  return opt?.label ?? ''
})

const filteredOptions = computed(() => {
  const q = query.value.trim()
  if (!q) return props.options
  return props.options.filter((o) => searchTextIncludes(o.label, q))
})

function detachOutsideListener() {
  removeOutsideListener?.()
  removeOutsideListener = null
}

function attachOutsideListener() {
  detachOutsideListener()
  const handler = (e) => {
    if (rootRef.value && !rootRef.value.contains(e.target)) {
      open.value = false
    }
  }
  document.addEventListener('pointerdown', handler, true)
  removeOutsideListener = () => document.removeEventListener('pointerdown', handler, true)
}

function focusSearchInput() {
  const input = searchRef.value
  if (!input) return
  try {
    input.focus({ preventScroll: true })
  } catch {
    input.focus()
  }
}

watch(open, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      window.setTimeout(() => {
        attachOutsideListener()
        focusSearchInput()
      }, 0)
    })
  } else {
    detachOutsideListener()
    query.value = ''
  }
})

onUnmounted(() => {
  detachOutsideListener()
})

function toggle(e) {
  e.preventDefault()
  e.stopPropagation()
  if (props.disabled) return
  open.value = !open.value
}

function selectOption(opt) {
  if (opt.disabled) return
  emit('update:modelValue', opt.value)
  open.value = false
}
</script>

<template>
  <div ref="rootRef" class="relative w-full" dir="rtl">
    <button
      type="button"
      class="select select-bordered flex w-full items-center justify-between gap-2 text-start"
      :class="{
        'select-sm': size === 'sm',
        'pointer-events-none opacity-60': disabled,
      }"
      :disabled="disabled"
      :aria-expanded="open"
      aria-haspopup="listbox"
      @click="toggle"
    >
      <span class="min-w-0 truncate" :class="{ 'text-base-content/50': !selectedLabel }">
        {{ selectedLabel || placeholder }}
      </span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-4 w-4 shrink-0 opacity-60 transition-transform"
        :class="{ 'rotate-180': open }"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <div
      v-show="open"
      class="absolute z-50 mt-1 w-full rounded-box border border-base-300 bg-base-100 shadow-lg"
      role="listbox"
      @click.stop
    >
      <div class="border-b border-base-300 p-2">
        <input
          ref="searchRef"
          v-model="query"
          type="search"
          dir="rtl"
          lang="fa"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
          enterkeyhint="search"
          class="input input-bordered w-full"
          :class="{ 'input-sm': size === 'sm' }"
          :placeholder="searchPlaceholder"
          @pointerdown.stop
          @click.stop
          @keydown.stop
        />
      </div>
      <ul class="max-h-60 overflow-y-auto py-1">
        <li v-for="opt in filteredOptions" :key="String(opt.value)">
          <button
            type="button"
            class="w-full px-3 py-2 text-start hover:bg-base-200"
            :class="{
              'bg-primary text-primary-content hover:bg-primary': opt.value === modelValue,
              'cursor-not-allowed opacity-50': opt.disabled,
            }"
            :disabled="opt.disabled"
            role="option"
            :aria-selected="opt.value === modelValue"
            @click="selectOption(opt)"
          >
            {{ opt.label }}
          </button>
        </li>
        <li v-if="!filteredOptions.length" class="px-3 py-2 text-sm opacity-60">موردی یافت نشد</li>
      </ul>
    </div>

    <input
      v-if="required"
      type="text"
      tabindex="-1"
      aria-hidden="true"
      class="pointer-events-none absolute h-0 w-0 opacity-0"
      :value="modelValue"
      required
    />
  </div>
</template>
