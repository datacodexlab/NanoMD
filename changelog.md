# 📝 سجل التغييرات (Changelog) - NanoMD

## [v1.10.0] - 2026-10-17

### أُضيف (Added)
- **القراءة الصوتية:** زرار ▶ (فوق CTX على الكمبيوتر، ومكان CTX في شريط الموبايل) بيقرا المعاينة بصوت Gemini مصري طبيعي، والكلام الإنجليزي بيتنطق إنجليزي. العناوين والفقرات والقوايم بس، والكود والجداول بتتخطى.
- **شريط تشغيل خفيف فوق النص:** الفقرة اللي فاتت / تشغيل وإيقاف مؤقت / اللي بعدها، وشريط تقدم بالفقرات، وزرار سرعة (1× / 1.25× / 1.5× / 0.75×) بيحافظ على طبقة الصوت (WSOLA)، وآخر سرعة بتتحفظ. الفقرة اللي بتتقري بتتلوّن.
- **Streaming:** الصوت بيبدأ بعد حوالي ثانيتين ونص، والنص بيتبعت على حتت كبيرة (طلب لكل حتة) عشان يوفر الحصة.
- **تخزين الصوت في المتصفح (IndexedDB):** أي حتة اتولدت كاملة بتشتغل تاني من غير طلب. بيفضل طول ما المستند في السجل، وغير كده بيتمسح بعد 7 أيام، وحد أقصى 250 ميجا.
- **لوحة «الذكاء الاصطناعي»** (⚙ في الهيدر، أو ضغطة طويلة على زرار الصوت، أو تلقائياً لو مفيش مفتاح): مفاتيح Gemini (اختبار، إضافة، مسح، تنبيه عند إضافة مفتاح تاني)، الصوت Kore أو Charon مع تجربة، حجم الصوت المحفوظ ومسحه، ومصدر الترجمة.
- **مفتاح المستخدم بس:** بيتحفظ في المتصفح (localStorage، أو sessionStorage لو اختار ما يحفظوش)، وبيتبعت لـ `generativelanguage.googleapis.com` مباشرة. موقعنا ما بيشوفهوش.
- **احتياط تلقائي:** Flash-Lite TTS الأول، وبعدين Flash بنفس المفتاح، وبعدين المفتاح الاحتياطي. ولو كله خلص: رسالة «الحصة المتاحة لمفاتيحك خلصت حالياً» مع ميعاد الرجوع التقريبي.
- **الترجمة بمفتاح Gemini (اختياري):** `gemini-flash-lite-latest` من المتصفح مباشرة. الافتراضي فاضل خدمة الموقع.

### تغيّر (Changed)
- **الموبايل:** CTX اتشال من الشريط. الضغطة الطويلة على الترجمة بتفتح قايمة صغيرة فوقه (السياق + AR/EN)، وزرار الترجمة بيبقى أزرق خفيف لما السياق شغال.

## [v1.9.2] - 2026-10-17

### أُزيل (Removed)
- **`src/worker.ts`:** كود Worker قديم ما بيتنشرش من التحويل لـ Pages Functions (2026-05-12). الـbackend الحقيقي في `functions/api/`.
- مكتبة `@cloudflare/kv-asset-handler` (كان بيستخدمها `worker.ts` بس)، واستثناؤه من `tsconfig.app.json`.

### تغيّر (Changed)
- `CONTRIBUTING.md` و`README.md` بقوا بيشيروا لـ `functions/api/` وCloudflare Pages بدل Workers.

## [v1.9.1] - 2026-10-17

### تغيّر (Changed)
- **مسافة تحت الهيدر:** في Slate وNoir بداية النص بقت تحت الهيدر بمسافة حوالي سطرين (`padding-top: 2.75rem`) بدل ما يكون لازق فيه.

### أُصلح (Fixed)
- **`npm run lint` رجع يشتغل:** أُضيف `eslint.config.js` (flat config لـ ESLint 9) بالإضافات المتسطّبة أصلاً. النتيجة: 0 أخطاء.
- **Toast:** الإشعار بياخد آخر `onClose` من غير ما التايمر يتصفّر مع كل إعادة رسم (`useRef`)، و`duration` بقى في الـdependencies.
- **Regex العربي** في `CodeBlock.tsx` و`rehypeBidi.ts` بقى مكتوب بـ unicode escapes بدل رموز Unicode خام (نفس السلوك).
- **`worker.ts`:** `@ts-ignore` بقى `@ts-expect-error` مع السبب، وشيل متغيرات `catch` مش مستخدمة.
- `no-explicit-any` بقى تحذير مؤقتاً (15 موضع) لحد جولة تحديد أنواع لوحدها.

## [v1.9.0] - 2026-10-17

### تغيّر (Changed)
- **ثيم Slate بقى رمادي فاتح للقراءة الكثيفة:** خلفية `#F4F4F3`، نص `#3B3B3B` (مش أسود صريح)، والكود جوه السطر أحمر `#C7254E` (شبه لوحة Claude).
- **ثيم Noir بقى فحمي ناعم واسمه «داكن»:** خلفية `#1E1E1E` بدل `#000`، نص `#D4D4D4` بدل `#FFF`، والكود جوه السطر `#E06C75`. التباين الأقصى كان بيعمل وهج وبيخلي النص يبان تقيل.
- **كثافة القراءة في Slate وNoir:** خط Segoe UI 14px، مسافات أقل، جداول بحدود كاملة وخلفية للعناوين، ونقط في القوايم بدل الشرطة. Cream بدون تغيير.
- **زرار نسخ الكود:** أيقونة ظاهرة دايماً في الركن العلوي اليمين جوه البلوك (كل الثيمات)، بدل الشريط المنفصل فوق البلوك. اسم اللغة اتشال.
- لون الكود جوه السطر بقى متغير لكل ثيم (`--inline-code-color`, `--inline-code-hover-bg`).
- **الثيم الافتراضي بقى Slate** لأي حد بيفتح الموقع لأول مرة (اللي اختار ثيم قبل كده بيفضل على اختياره).
- قواعد RTL ما اتلمستش.

## [v1.8.3] - 2026-09-30

### أُصلح (Fixed)
- **الترجمة كانت بتاخد 40+ ثانية:** نموذج `glm-4.7-flash` بيعمل "تفكير" مخفي قبل الترجمة (حوالي 1600 توكن). إيقافه بـ `chat_template_kwargs: { enable_thinking: false }` خلّى النص القصير يترجم في ~2.6 ثانية بدل 46، واستهلاك النيرونات أقل حوالي 8 مرات.
- **الاحتياطي ما كانش شغال:** `llama-3.2-11b-vision-instruct` كان بيرفض بخطأ 5016 (رخصة Meta). استُبدل بـ `mistral-small-3.1-24b-instruct` (مجاني ومجرَّب).
- **التبديل التلقائي:** بقى بيحصل عند الخطأ أو الرد الفاضي أو تجاوز مهلة 15 ثانية للنموذج، بدل الخطأ فقط.
- **البرومبت:** منع تكرار المصطلح الأصلي بين قوسين بعد ترجمته.

## [v1.8.2] - 2026-09-30

### أُصلح (Fixed)
- **الأزرار الجانبية (CTX/AR/EN) ما بقتش بتغطي أول السطر:** في وضع Split كانت بتغطي المحرر RTL على كل العروض، وفي وضع المعاينة بين 768 و830px. الحل: مساحة يمين محجوزة `--scroll-nav-gutter` (72px) على `main.has-scroll-nav` (سطح المكتب ≥768px فقط).

## [v1.8.1] - 2026-09-30

### أُصلح (Fixed)
- **RTL دائماً في المعاينة:** البنود والفقرات اللي بتبدأ بـ bold أو inline code ما بقتش بتقلب LTR — إزالة `unicode-bidi: plaintext` من البلوكات وقاعدة RTL موحدة.
- **عزل المقاطع الإنجليزية:** `@user`, `C++`, `C#`, `-flag`, `config.json`, `Telegram API` والتواريخ (`2026-09-30`, `11:00`) بتظهر كوحدة LTR سليمة داخل الجملة العربية (`rehypeBidi`).
- **الفقرة الإنجليزية الكاملة:** علامة الترقيم الأخيرة بتفضل في آخر الجملة.
- **المحرر:** اتجاه ثابت RTL بدل `auto`.
- **رقم الإصدار في الفوتر:** كان `v1.7.1` ثابت — بقى بيتقرأ تلقائياً من `package.json`.

### أُزيل (Removed)
- 75 ملف `*.sync-conflict-*` كانت بتكسر `npm run build`.

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
