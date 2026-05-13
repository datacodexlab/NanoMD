# 📝 سجل التغييرات (Changelog) - NanoMD

## [v1.8.0] - 2026-05-13

### أُضيف (Added)
- **Review Link:** وكلاء الذكاء الاصطناعي يقدرون يرفعوا مراجعة كاملة لـ `/api/share` مع `mode: "review"` و `expiresIn` فيرجع رابط يفتح Review Mode مباشرة في NanoMD.
- **بروتوكول Review Mode v3.0:** تحديث `ReviewModeGuide.tsx` ببروتوكول إنجليزي مضغوط يشمل ACTIVATION، LANGUAGE، TABLE FORMAT، WORKFLOW A/B/C، PROCESSING RESPONSES.
- **رسالة القرارات التلقائية:** زر النسخ في Review Mode يُلحق header ثابت (`✅ NanoMD Review — my decisions:`) وتعليمات للوكيل تلقائياً.
- **SEO كامل:** Open Graph، Twitter Card، Canonical، description، keywords في `index.html`.
- **og-image.jpg:** صورة مشاركة اجتماعية (1200×630، 46KB) لـ WhatsApp وتويتر.
- **GitHub Issue Templates:** قالبَي `bug_report.md` و `feature_request.md` في `.github/ISSUE_TEMPLATE/`.
- **Review Mode موبايل — Card Layout:** على شاشات < 640px كل بند يُعرَض كبطاقة عمودية مستقلة بدل جدول أفقي. أزرار القرار بحجم 44px، input يتوسع تلقائياً، progress bar sticky في الأعلى، زر النسخ sticky في الأسفل.
- **Fallback اللصق لـ Firefox:** عند حجب Clipboard API يظهر modal مع textarea — المستخدم يلصق بـ Ctrl+V بدل ظهور رسالة خطأ.

### أُصلح (Fixed)
- **بق `tryRepairEncoding`:** الحروف العربية (U+0600–U+067F) كانت تُفسَد عند المعالجة — إضافة guard يرجع النص كما هو لو أي حرف > U+00FF.
- **Toast شفاف:** استبدال `rgba(x,0.18)` بـ `color-mix(solid 14%, var(--bg-primary))` — الإشعار معتم دايماً بلون الثيم.
- **زر النسخ والـ progress bar على الموبايل:** `position:fixed` كان يفشل داخل `overflow-y:auto` — تحويل لـ `position:sticky` يعمل صح في scroll containers.
- **og-image:** تصغير من 1731×909 PNG (1MB) إلى 1200×630 JPEG (46KB) ضمن حد WhatsApp.

### تم التعديل (Changed)
- **عنوان الصفحة:** امتداد من 45 إلى 55 حرف لتحسين الـ SEO.
- **Sample Table في Guide:** تحديث لـ 5-column format مع review header block.
- **TTL المشاركة:** الافتراضي 30 يوم، Review Links 24 ساعة.

## [v1.7.1] - 2026-05-12

### أُصلح (Fixed)
- **أيقونة التطبيق (Favicon + PWA):** استبدال أيقونة Vite الافتراضية بشعار NanoMD الرسمي في تبويب المتصفح، مع دعم `apple-touch-icon` وملف `manifest.json` لتثبيت التطبيق من Chrome كـ PWA على سطح المكتب والموبايل.
- **كشف اتجاه الـ Code Block تلقائياً:** إضافة دالة `detectCodeDir` في `CodeBlock.tsx` تكشف أول حرف قوي في المحتوى (Arabic Unicode ranges كاملة أو Latin) وتُمرر `dir` attribute على `<pre>` — الـ code blocks العربية تصبح RTL والإنجليزية تبقى LTR تلقائياً.
- **إصلاح code blocks بدون لغة:** تحديث منطق `isInline` في `PreviewPane.tsx` ليعتمد على وجود `\n` لا على وجود className فقط — code fences بدون لغة محددة تُعرَض الآن كـ block صحيح لا كـ inline code.
- **اتجاه ذكي في المحرر:** تغيير `dir="rtl"` إلى `dir="auto"` على الـ textarea — كل سطر يكشف اتجاهه تلقائياً من أول حرف قوي فيه.
- **عناوين أعمدة الجداول:** إضافة `unicode-bidi: plaintext; text-align: start` على `th` في `preview.css` لتوافق عناوين الأعمدة الإنجليزية مع اتجاه المحتوى.

### تم التعديل (Changed)
- **تنظيف CSS لـ pre:** إزالة `direction: ltr; text-align: left` المُقيِّدة من `.preview-content pre` والاعتماد على `dir` attribute المُحدَّد برمجياً بدلاً منها.

## [v1.7.0] - 2026-05-07

### أُضيف (Added)
- **ترجمة واعية بالسياق:** إضافة خيار لتوجيه الترجمة لفهم مجال النص داخلياً قبل الصياغة دون عرض التحليل للمستخدم.
- **نموذج احتياطي للترجمة:** إضافة fallback إلى `@cf/zai-org/glm-4.7-flash` عند فشل نموذج الترجمة الأساسي بسبب خطأ خدمة مؤقت.
- **حد ترجمة أكبر:** رفع حد الترجمة المباشر من 5000 حرف إلى 50000 حرف.

### تم التعديل (Changed)
- **تحديث نموذج Workers AI:** استبدال نموذج `@cf/meta/llama-3.1-8b-instruct` بنموذج `@cf/google/gemma-4-26b-a4b-it` كنموذج أساسي.
- **ترجمة النص المحدد:** إصلاح ترجمة الجزء المحدد داخل المحرر باستخدام مدى التحديد الفعلي بدلاً من الاستبدال النصي غير الآمن.
- **واجهة الترجمة:** توحيد منطق طلب الترجمة بين سطح المكتب والموبايل، وإضافة Toggle لترجمة السياق.
- **لوجات الموقع:** تحديث نافذة "ما الجديد" ورقم الإصدار الظاهر في التطبيق إلى `v1.7.0`.

## [v1.6.0] - 2026-04-24

### أُضيف (Added)
- **أداة محاكاة الواجهة (UI Viewport Lab):** إطلاق أداة مستقلة (`ui-viewport-lab.html`) تتيح للمطورين والعملاء معاينة واجهة NanoMD في بيئات مختلفة (Desktop, Tablet, Mobile) دون الحاجة لبيئة تطوير (Dev Server).
- **ثيم دافئ (Warm Theme):** تصميم واجهة المعمل بألوان دافئة (Cream/Nescafe) مع أزرار تحكم باللون اللبني المريح (#60a5fa).
- **تحميل المحتوى الذكي:** دعم حقن محتوى Markdown (عبر URL Hash) للتجربة الفورية لحالات التطبيق المختلفة (Empty State, Sample Content).
- **التوافق المحلي (Local Compatibility):** إصلاح مسارات الأصول (Assets) في نسخة الـ `dist` لتعمل بسلاسة عبر بروتوكول `file://`.

## [v1.6.0] - 2026-04-23

### أُضيف (Added)
- **دليل وضع المراجعة (Review Mode Guide):** إضافة نافذة تفاعلية (Modal) لشرح كيفية استخدام ميزة "وضع المراجعة" بالتفصيل خطوة بخطوة.
- **محاكاة تفاعلية (Live Demo):** عرض حي متحرك داخل الدليل يشرح كيفية تحول نصوص الـ Markdown لجدول تفاعلي مع أزرار (قبول/رفض/تأجيل).
- **مثال قابل للنسخ (Try it Yourself):** توفير نموذج Markdown حقيقي يمكن للعميل نسخه وتجربته فوراً من داخل الدليل بضغطة زر.
- **لصق سريع من الدليل:** ربط الزر الرئيسي في نهاية الدليل بوظيفة اللصق (Smart Paste) لقراءة الـ Clipboard وتحويل النص وعرضه في المحرر مباشرة.

### تم التعديل (Changed)
- **تحسين شريط التنقل (Header Alignment):** حل مشكلة تداخل الأزرار (Wrapping) في الشاشات المتوسطة وتقليل الهوامش لضمان ظهور العناصر في سطر واحد منظم.

## [v1.5.1] - 2026-04-23
- **تحسينات واجهة الموبايل (Mobile UI Polish):**
  - منع التكبير التلقائي (Auto-zoom) وتخطي العرض عند التركيز على العناصر عبر ضبط `viewport`.
  - إخفاء أشرطة التمرير (Scrollbars) الافتراضية في شاشات الموبايل لتوفير مساحة العرض.
  - تصميم شعار مصغر (NMD) يظهر في الموبايل لتقليل المساحة المستهلكة في الهيدر، مع تصغير أيقونات الهيدر لتناسب سطر واحد.
  - دمج أزرار الترجمة (AR/EN) في زر "ترجمة" موحد وذكي في الشريط السفلي، يدعم الضغطة المطولة للتبديل بين اللغات، والضغطة القصيرة للترجمة.

## [v1.5.0] - 2026-04-23

### تم التعديل (Changed)
- **إعادة تصميم واجهة الموبايل (Mobile UX Redesign):** 
  - إخفاء أزرار التحكم المعقدة من الأعلى وتخصيص الهيدر للموبايل ليكون أيقونات فقط (لصق، رفع ملف، السجل، حفظ مسودة، مشاركة، نسخ، تغيير الثيم).
  - تطوير الشريط السفلي الموحد (Mobile Bottom Nav) ليحتوي على كافة أدوات العرض والتحرير والترجمة والتنقل بتصميم زجاجي عصري (Glassmorphism).
  - نقل خيارات النسخ والتصدير (CopyMenu) في الموبايل من زر عائم جانبي إلى قائمة تنزلق من الأسفل (Bottom Sheet) متصلة بزر "تصدير" في الشريط السفلي.
  - تحسين المسافات والفواصل بين عناصر الواجهة (Fluid Icons Scaling) لمنع التداخل بين المحتوى وشريط الأدوات.

## [v1.4.0] - 2026-04-23

### أُضيف (Added)
- **الترجمة الذكية (Smart Translation):** دمج نموذج Llama 3.1 عبر Cloudflare Workers AI لترجمة النصوص بين العربية والإنجليزية.
- **زر ترجمة المحدد (Translate Selected):** القدرة على ترجمة جزء محدد من النص فقط أو ترجمة كامل المحتوى عند عدم تحديد نص.
- **تراجع عن الترجمة (Undo Translation):** زر لاستعادة النص الأصلي بعد إجراء عملية الترجمة للحفاظ على الأمان والتجربة السلسة.
- **إشعارات الترجمة:** حالات تحميل بصرية أثناء الترجمة ورسائل منبثقة (Toast) عند فشل العملية.

## [v1.3.0] - 2026-04-22
- **أزرار التنقل الذكية (Smart Scroll Navigation):** إضافة مكوّن بأزرار تنقل ذكية للتحكم بالتمرير (أعلى، أسفل، صفحة لأعلى، صفحة لأسفل) مع ظهور وإخفاء ديناميكي بناءً على مكان التمرير.
- **مؤشر التمرير (Scroll Progress Indicator):** إضافة شريط تقدم رأسي بجوار أزرار التنقل يعرض نسبة تمرير المستخدم داخل المحتوى الطويل.
- **نسخ الكود المضمّن (Inline Code Copy):** دعم إمكانية النسخ السريع لأكواد السطر الواحد عند النقر عليها، مع عرض رسالة تأكيدية.
- **الروابط التلقائية (Auto-link):** تفعيل النقر المباشر على عناوين URL العادية وفتحها في نافذة جديدة بشكل أوتوماتيكي.

### تم التعديل (Changed)
- **دعم اتجاه النص (RTL Enhancements):** إصلاح جذري لمشكلة تداخل الأقواس والكلمات الإنجليزية داخل الفقرات العربية من خلال فرض `unicode-bidi: isolate` على العناصر المضمنة.

## [v1.2.0] - 2026-04-22

### أُضيف (Added)
- **حفظ مسودة محلية (Local Draft Saving):** إضافة زر `حفظ مسودة` يتيح حفظ لقطة من النص الحالي في متصفح المستخدم للرجوع إليها لاحقاً دون رفعها إلى الكلاود (للأمان والسرعة).
- **استرجاع المسودات (Draft Restoration):** زر `استرجاع النص` داخل نافذة السجل يقوم بتحميل المسودة المحفوظة مباشرة إلى المحرر لمواصلة العمل عليها.
- **ميزة الطباعة (Print Feature):** إضافة زر طباعة يوفر نسخة نقية من محتوى المعاينة فقط، مع إخفاء أشرطة التنقل والمحرر باستخدام `@media print`.
- **مشاركة المحتوى (Share via Cloudflare KV Worker):** نظام مشاركة ينشئ روابط قصيرة تعتمد على Cloudflare KV لحفظ المحتوى مؤقتاً (لمدة 30 يوماً).
- **وضع القراءة فقط (Shared View Mode):** عند فتح رابط مشاركة، يتم تفعيل وضع "القراءة فقط" مع إخفاء أدوات التعديل وإظهار شريط تنبيهي للمستخدم.

### تم التعديل (Changed)
- **نافذة السجل (Share History Modal):** تم ترقية السجل ليصبح "السجل الشامل" قادراً على التفريق بين (روابط المشاركة المنشورة) وبين (المسودات المحلية)، وعرض واجهة مخصصة لكل نوع. تم رفع حد السجل الأقصى إلى 20 عنصراً وتفعيل شريط التمرير (Scroll).
- **بيئة النشر (Deployment Architecture):** تم الانتقال بالكامل من بيئة Cloudflare Pages Functions إلى بنية Cloudflare Workers المستقلة وإعادة تفعيل `src/worker.ts` وإلغاء مجلد `functions` لضمان استقرار عملية النشر والأتمتة (CI/CD).

## [v1.1.1] - 2026-04-17

### تم التعديل (Changed) — Manus UI Style

- **Typography System:** Added `JetBrains Mono` font. Updated root variables: `--font-mono`, `--font-latin`, `--leading-normal`, `--leading-relaxed`, `--leading-tight`.
- **Theme Variables (3 themes):** Added Manus-specific CSS variables to Cream, Noir, and Slate themes: `--border-color`, `--accent-hover`, `--code-bg`, `--code-border`, `--link-color`, `--link-hover`, `--hover-bg`.
- **Preview Styles:** Rewrote `.preview-content` section in `preview.css` with Manus minimalist style — cleaner headings, borderless tables with subtle separators, improved inline/block code rendering.
- **CodeBlock Component:** Replaced old macOS-dots header with clean Manus-style header showing language name + Copy button using `--code-bg` / `--code-border` CSS variables.
- **PreviewPane:** Updated `markdownComponents` to properly distinguish inline code from code blocks, added `pre` handler to prevent double-wrapping.
- **Backup:** Created `_backup_before_manus_style/` folder with 8 files (original state before this update).

## [v1.1.0] - 2026-04-08

### أُضيف (Added)

- **URL Hash Loading:** Auto-load markdown content from Base64-encoded URL hash. Agent can generate clickable links that open NanoMD with pre-loaded content.
- **Split Columns:** Support for separate `Item` and `Recommendation` columns in review tables. Columns display separately but merge with `←` on copy.
- **Section Separator Rows:** Visual divider rows in review tables (detected by empty `#` + `📌`). Displayed as centered bold text without action buttons, excluded from copy and progress counter.
- **Section Background Colors:** Alternating subtle background colors for row groups between separators, using CSS variables for theme compatibility.
- **File Upload Button:** Upload `.md`, `.txt`, or `.markdown` files directly from disk via Header button and EmptyState page. Uses FileReader API with UTF-8 encoding.
- **Recommendation Column Detection:** Added `التوصية` / `recommendation` / `توصية` as recognized column names for the split-column format.

### تم التعديل (Changed)

- Updated version to `v1.1.0` in `package.json` and footer.
- Consolidated localStorage and URL hash loading into a single `useEffect` with hash taking priority.

## [v1.0.1] - 2026-02-25

### أُضيف (Added)

- وثائق المشروع الأساسية والإلزامية.
  - `master-constitution.md`
  - `project-key.md`
  - `project-context.md`
- تصميم شعار (Logo) احترافي بصيغة SVG مطابق تماماً لطلب المطور بتدرجات لونية (أزرق وأصفر).
- تذييل (Footer) للتطبيق يحتوي على رقم الإصدار (v1.0.0) وحقوق النشر.

### تم التعديل (Changed)

- تحسين ملحوظ في ظهور وحجم زر الحذف (Clear Button) أثناء استخدام وضع المراجعة (Review Mode).
- تحديثات على ألوان وشكل الشعار السابق ليتناسب مع الصورة المطلوبة للعلامة التجارية.
