<div align="center">
  <img src="docs/nanomd-logo.png" width="110" alt="NanoMD" />

  # NanoMD

  **محرر Markdown عربي سريع، بسيط، وبدون تعقيدات**

  *A fast, clean Arabic-first Markdown editor*

  [![Live Demo](https://img.shields.io/badge/🚀_جرب_الآن-Live_Demo-3B82F6?style=for-the-badge)](https://nanomd.pages.dev/)
  [![Version](https://img.shields.io/badge/version-1.7.1-blue?style=flat-square)](changelog.md)
  [![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
  [![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
  [![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=flat-square&logo=cloudflare)](https://workers.cloudflare.com)

</div>

---

## العربي

NanoMD محرر Markdown مصمم أصلاً للغة العربية. يحول النصوص المنسوخة من أدوات الذكاء الاصطناعي (ChatGPT، Claude، Gemini) إلى وثائق منسقة ومقروءة بضغطة زر — بدعم أصيل للـ RTL.

### ✨ الميزات

| الميزة | الوصف |
|---|---|
| **لصق ذكي** | اضغط `Ctrl+V` في أي مكان، يتحول النص فوراً إلى Markdown منسق |
| **RTL أصيل** | كشف تلقائي لاتجاه النص سطراً بسطر — عربي RTL وإنجليزي LTR |
| **ترجمة ذكية** | ترجمة AR↔EN مدعومة بـ Gemma 4 عبر Cloudflare Workers AI |
| **وضع المراجعة** | تحويل النصوص لجداول مراجعة تفاعلية |
| **واجهة موبايل** | شريط أدوات سفلي زجاجي (Glassmorphism) مخصص للموبايل |
| **مشاركة سحابية** | روابط مؤقتة عبر Cloudflare KV تُحذف آلياً بعد 30 يوماً |
| **PWA** | قابل للتثبيت كتطبيق على سطح المكتب والموبايل |
| **وضع التركيز** | واجهة نظيفة للكتابة بدون تشتيت |
| **عرض مزدوج** | محرر ومعاينة جنباً إلى جنب |
| **حفظ محلي** | مسودات تلقائية في المتصفح بدون خوادم |

### ⌨️ اختصارات لوحة المفاتيح

| الاختصار | الوظيفة |
|---|---|
| `Ctrl+V` | لصق ذكي من أي مكان |
| `Ctrl+1` | وضع القراءة (Preview) |
| `Ctrl+2` | وضع التعديل (Editor) |
| `Ctrl+3` | العرض المزدوج (Split) |
| `Ctrl+4` | وضع التركيز (Focus) |

---

## English

NanoMD is an Arabic-first Markdown editor that instantly renders AI-generated text (ChatGPT, Claude, Gemini) into clean, formatted documents with native RTL support.

### Features

- **Smart Paste** — press `Ctrl+V` anywhere to instantly render Markdown
- **Native RTL/LTR** — auto-detects text direction per line and per code block
- **AI Translation** — AR↔EN powered by Gemma 4 via Cloudflare Workers AI
- **Review Mode** — converts text into structured, interactive review tables
- **Mobile UI** — glassmorphism bottom toolbar optimized for thumb reach
- **Cloud Sharing** — Cloudflare KV links that auto-expire in 30 days
- **PWA** — installable as a desktop or mobile app
- **Focus Mode** — distraction-free writing environment
- **Split View** — editor and preview side by side
- **Local Drafts** — auto-save to localStorage, no server needed

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, CSS Variables, PostCSS |
| Markdown | react-markdown, remark-gfm, rehype-highlight, rehype-sanitize |
| Backend | Cloudflare Workers (KV Storage + Workers AI) |
| Icons | Lucide React |
| Font | Google Fonts — Cairo |

### Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

### Deployment

The app runs on Cloudflare Workers. See `scripts/deploy.bat` for deployment commands, and refer to the [Cloudflare Workers documentation](https://developers.cloudflare.com/workers/) for setup.

### Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

---

<div align="center">
  <sub>Built by <a href="https://github.com/Alfareslab">DataCodexLab</a> · MIT License</sub>
</div>
