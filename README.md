# سیگار — انبار کالا (Nuxt 3)

برنامه تک‌صفحه‌ای فقط در مرورگر (`ssr: false`)؛ کالاها در **localStorage** با کلید `sigar-materials`.

## راه‌اندازی

```bash
npm install
npm run dev
```

ساخت / پیش‌نمایش:

```bash
npm run build
npm run preview
```

میزبانی استاتیک:

```bash
npm run generate
```

## رابط کاربری

- **Tailwind CSS v4** با [`@tailwindcss/vite`](https://tailwindcss.com/docs/installation/using-vite)
- **daisyUI 5** — تم‌های `corporate` و `dark` (`assets/css/main.css`)
- پوسته اصلی: `app.vue` با `dir="rtl"` و `lang="fa"`

## ساختار

- `pages/index.vue` — انبار، فرم، جدول، آمار
- `pages/customers/` — مشتریان، فاکتور چندردیفی، تاریخچه (`/customers`, `/customers/:id`)
- `composables/useMaterials.js` — ذخیره و عملیات کالا
- `composables/useCustomers.js` — مشتری و فروش در `localStorage` (`sigar-customers`؛ مهاجرت از `sigar-markets`)
- `assets/css/main.css` — `@import 'tailwindcss'` + `@plugin 'daisyui'`
- `nuxt.config.mjs` — `future.compatibilityVersion: 3`
