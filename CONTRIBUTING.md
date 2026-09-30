# Contributing to NanoMD

شكراً لاهتمامك بالمساهمة في NanoMD!

---

## البداية السريعة

```bash
# 1. Fork المشروع من GitHub
# 2. Clone نسختك
git clone https://github.com/YOUR_USERNAME/NanoMD.git
cd NanoMD

# 3. تثبيت الاعتمادات
npm install

# 4. تشغيل خادم التطوير
npm run dev
```

## هيكل المشروع

| المجلد | المحتوى |
|---|---|
| `src/components/preview/` | عرض Markdown — PreviewPane، CodeBlock، ReviewTable |
| `src/components/editor/` | المحرر النصي |
| `src/components/layout/` | Header، MobileNav، SplitView، FocusMode |
| `src/components/ui/` | مكونات مشتركة — أزرار، مودالات، إلخ |
| `src/contexts/` | إدارة الحالة العامة والترجمة |
| `src/hooks/` | Custom Hooks |
| `src/worker.ts` | Cloudflare Worker — KV sharing & Workers AI translation |

## إرسال تغييراتك

1. أنشئ branch جديد: `git checkout -b feature/your-feature`
2. اعمل تغييراتك وتأكد من التشغيل المحلي
3. افتح Pull Request مع وصف واضح

## ملاحظات مهمة

- التطبيق **عربي أولاً (RTL-first)** — اختبر أي تغيير بمحتوى عربي وإنجليزي
- الـ Inline styles مستخدمة بدلاً من Tailwind في المكونات المعتمدة على CSS Variables للثيم
- الـ `src/worker.ts` يشتغل على Cloudflare Workers — التعديلات تحتاج Cloudflare account للـ deploy

## الإبلاغ عن مشكلة

افتح [Issue](https://github.com/datacodexlab/NanoMD/issues) مع:
- وصف المشكلة
- خطوات التكرار
- المتصفح والنظام
