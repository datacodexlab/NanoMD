import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Wand2, MousePointerClick, Sparkles, ClipboardPaste } from 'lucide-react';

interface ReviewModeGuideProps {
    isOpen: boolean;
    onClose: () => void;
    onPaste: () => void;
}

export const ReviewModeGuide: React.FC<ReviewModeGuideProps> = ({ isOpen, onClose, onPaste }) => {
    const [isCopied, setIsCopied] = useState(false);
    const [isSampleCopied, setIsSampleCopied] = useState(false);
    const [demoState, setDemoState] = useState<'before' | 'after'>('before');

    const promptText = `You are a NanoMD Review Mode agent.

## ACTIVATION
When given this protocol, respond with exactly:
"NanoMD Review Mode ready. What would you like me to review?
Share the topic, context, or any relevant files."

Do NOT ask meta questions about your own performance.
Do NOT start a review until the user specifies the subject.

## LANGUAGE
Always respond in the language the user writes in — not the protocol language.
Arabic input → Arabic output. English input → English output.
The review table content (items, recommendations) also follows the user's language.

## WHEN TO USE
3+ decisions needed → Review Mode table. Single question → ask in chat.

## REVIEW MODES — pick automatically based on context
🔭 Exploratory  — new project/vision, deep open questions, 10–20+ items
🎯 Development  — feature/improvement, focused design questions, 5–10 items
🔧 Surgical     — specific bug/fix, diagnostic questions only, 3–5 items
📋 Audit        — quality/security/performance sweep, full coverage

## TABLE FORMAT

Preferred — 5-column split:
| # | Item | Recommendation | Details | Decision |
|---|------|----------------|---------|----------|
| 1 | 🔴 [item ≤45ch] | [rec ≤60ch] | [detail] | |

Section separators inside table (optional):
| | 📌 Section Name | | | |

## PRIORITY
🔴 Critical   — explicit decision required, never skip
🟡 Important  — can defer with care
🟢 Optional   — if no response received, recommendation auto-applies

## RULES
- 🔴 items FIRST in table
- All item names must be unique and specific (describe content, not category)
- Item ≤ 45 chars | Recommendation ≤ 60 chars
- Leave Decision column empty — user fills it in NanoMD

## HEADER (required on every review)
# 🔍 Review: [Title]
> **Context:** [why we're reviewing — 1–2 lines]
> **Mode:** [🔭/🎯/🔧/📋] [mode name]
> **Reference:** [linked plan/file if any]
> **Sections:** [Section A] (1–3) · [Section B] (4–6)
> **Items:** [X] items in [Y] sections

## NanoMD COPY OUTPUT FORMAT
When user copies from NanoMD, output is:
  Item ← Recommendation → Decision
Example:
  1. 🔴 API rate limiting missing ← add Cloudflare WAF rule → ✅ Approved
  2. 🟢 Add dark mode ← defer to v2 → [default: ✅ Deferred — recommendation applied]

## AGENT WORKFLOW

### A — If you have HTTP access (preferred):
1. Write the full review in the format above
2. POST to NanoMD API:
   POST https://nanomd.pages.dev/api/share
   Content-Type: application/json; charset=utf-8
   { "content": "<review markdown>", "mode": "review", "expiresIn": 86400 }
   → Response: { "id": "xxxxxxxxxxxx" }
3. If you have project file access → save review to: reviews/XX-review-[name].md
4. Present to user:
   "Open this link to review and answer the questions:
   👉 https://nanomd.pages.dev/?share=[id]
   Answer each item using the ✅ ❌ ⏸️ buttons, then copy and send back to me."

### B — If you have project access but no HTTP:
1. Write the review and save to reviews/XX-review-[name].md
2. Tell user: "Open https://nanomd.pages.dev, paste the file content, then copy your decisions and send back."

### C — No HTTP and no file access:
1. Write the review in the table format above
2. Tell user: "Paste this into https://nanomd.pages.dev to use the interactive review buttons.
   Copy your decisions and send back to me."

## PROCESSING RESPONSES
NanoMD automatically prepends this header when the user copies decisions:

  ✅ NanoMD Review — my decisions:

  1. 🔴 Item ← Rec → Decision
  ...

  ---
  Save these decisions in the review file and proceed with the required action.

When you receive this message:
1. Confirm receipt in the user's language
2. Update reviews/XX-review-[name].md with the decisions (if file access)
3. Proceed immediately with the required action — no need to re-ask what to do`;

    // Real sample markdown the user can copy and paste to try
    const sampleMarkdown = `# 🔍 Review: App Landing Page
> **Context:** Reviewing landing page before public launch
> **Mode:** 🎯 Development
> **Items:** 3 items in 1 section

| # | Item | Recommendation | Details | Decision |
|---|------|----------------|---------|----------|
| 1 | 🔴 Logo Size | Increase to 128px | Current size too small on mobile | |
| 2 | 🟡 Font Family | Switch to Inter | Better readability for UI text | |
| 3 | 🟢 Footer Links | Add social links | Optional but improves engagement | |`;

    const handleCopy = () => {
        navigator.clipboard.writeText(promptText);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleCopySample = () => {
        navigator.clipboard.writeText(sampleMarkdown);
        setIsSampleCopied(true);
        setTimeout(() => setIsSampleCopied(false), 2500);
    };

    // Auto toggle demo every 6 seconds (slower pace for readability)
    useEffect(() => {
        if (!isOpen) return;
        const interval = setInterval(() => {
            setDemoState(prev => prev === 'before' ? 'after' : 'before');
        }, 6000);
        return () => clearInterval(interval);
    }, [isOpen]);

    // Prevent scrolling on body when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-end sm:justify-center p-0 sm:p-4 md:p-6 print:hidden print-hide">
            <div 
                className="absolute inset-0 bg-background/98 sm:bg-background/95 backdrop-blur-xl transition-opacity animate-in fade-in duration-300"
                onClick={onClose}
            ></div>
            
            <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-background sm:bg-card border-x border-t sm:border-b border-border shadow-2xl rounded-t-3xl sm:rounded-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8 fade-in duration-500 overflow-hidden mt-auto sm:mt-0">
                {/* Mobile Handle */}
                <div className="sm:hidden w-full flex justify-center pt-3 pb-1 bg-background">
                    <div className="w-12 h-1.5 bg-border rounded-full"></div>
                </div>

                {/* Header */}
                <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border bg-background sm:bg-card/95 backdrop-blur-md z-10">
                    <div className="flex items-center gap-2 text-accent">
                        <Sparkles className="w-6 h-6" />
                        <h2 className="text-xl sm:text-2xl font-bold font-outfit">وضع المراجعة التفاعلي</h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 -mr-2 rounded-xl hover:bg-secondary text-muted hover:text-foreground transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto bg-background sm:bg-card">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Column 1 (Right in RTL): Steps & Prompt — More detailed */}
                        <div className="space-y-6">
                            <div className="space-y-5">
                                <h3 className="text-lg font-bold text-foreground">كيف يعمل؟</h3>
                                <p className="text-sm text-muted leading-relaxed">
                                    وضع المراجعة يحول جداول الـ Markdown العادية إلى واجهة تفاعلية بأزرار قبول ✅ ورفض ❌ — بدل ما تكتب ردك يدوي، بتضغط زر واحد وخلاص.
                                </p>
                                
                                <div className="space-y-5">
                                    {/* Step 1 */}
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0 mt-0.5 font-bold">1</div>
                                        <div>
                                            <p className="font-bold text-foreground">انسخ التعليمات وأعطيها للـ AI</p>
                                            <p className="text-sm text-muted leading-relaxed mt-1">
                                                انسخ البرومبت اللي تحت وألصقه في أي محادثة مع نموذج AI
                                                <span className="text-foreground/60"> (ChatGPT، Claude، Gemini...)</span>.
                                                <br/>
                                                النموذج هيفهم إنك عايز الرد يكون في جدول مع عمود للقرارات.
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {/* Prompt Box */}
                                    <div className="relative group rounded-xl border border-border bg-secondary/50 p-4 font-mono text-sm text-foreground/80 overflow-x-auto overflow-y-auto whitespace-pre-wrap text-left max-h-[220px]" dir="ltr">
                                        {promptText}
                                        <button 
                                            onClick={handleCopy}
                                            className="absolute top-2 right-2 p-2 bg-background border border-border rounded-lg shadow-sm opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent hover:border-accent hover:text-white"
                                            title="Copy prompt"
                                        >
                                            {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                    </div>

                                    {/* Step 2 */}
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0 mt-0.5 font-bold">2</div>
                                        <div>
                                            <p className="font-bold text-foreground">احصل على الرد بصيغة جدول</p>
                                            <p className="text-sm text-muted leading-relaxed mt-1">
                                                الـ AI هيرد عليك بجدول Markdown فيه توصياته مرتبة حسب الأهمية:
                                                <br/>
                                                <span className="inline-flex items-center gap-1 mt-1">🔴 <span className="text-foreground/70 font-medium">حرج</span></span>
                                                <span className="inline-flex items-center gap-1 mx-2">🟡 <span className="text-foreground/70 font-medium">مهم</span></span>
                                                <span className="inline-flex items-center gap-1">🟢 <span className="text-foreground/70 font-medium">اختياري</span></span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Step 3 */}
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0 mt-0.5 font-bold">3</div>
                                        <div>
                                            <p className="font-bold text-foreground">الصق النتيجة هنا وشوف السحر</p>
                                            <p className="text-sm text-muted leading-relaxed mt-1">
                                                انسخ رد الـ AI وألصقه في NanoMD — الجدول هيتحول فوراً لأزرار تفاعلية.
                                                اضغط ✅ للقبول أو ❌ للرفض، وفي الآخر انسخ ملخص قراراتك بضغطة واحدة.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Column 2 (Left in RTL): Live Demo + Try It Sample */}
                        <div className="space-y-5">
                            {/* Live Demo */}
                            <div className="bg-secondary/30 rounded-2xl p-5 border border-border flex flex-col">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                                        <Wand2 className="w-5 h-5 text-accent" />
                                        معاينة حية
                                    </h3>
                                    <button 
                                        onClick={() => setDemoState(prev => prev === 'before' ? 'after' : 'before')}
                                        className="text-xs px-3 py-1.5 rounded-full bg-background border border-border hover:border-accent transition-colors font-medium text-muted hover:text-foreground"
                                    >
                                        {demoState === 'before' ? 'شاهد التحويل ✨' : 'رجوع للبداية ↩'}
                                    </button>
                                </div>

                                <div className="relative min-h-[190px] flex items-center justify-center">
                                    {/* Before State: Markdown */}
                                    <div className={`absolute inset-0 transition-all duration-700 ${demoState === 'before' ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-95 blur-sm z-0'}`}>
                                        <div className="bg-[#1e1e1e] rounded-xl p-4 font-mono text-xs sm:text-[10px] md:text-xs text-gray-300 leading-relaxed overflow-hidden h-full border border-border/50 shadow-inner flex flex-col justify-center" dir="ltr">
<span className="text-blue-400">|</span> # <span className="text-blue-400">|</span> Item <span className="text-blue-400">|</span> Recommendation <span className="text-blue-400">|</span> Details <span className="text-blue-400">|</span> Decision <span className="text-blue-400">|</span><br/>
<span className="text-blue-400">|</span>---<span className="text-blue-400">|</span>------<span className="text-blue-400">|</span>----------------<span className="text-blue-400">|</span>---------<span className="text-blue-400">|</span>----------<span className="text-blue-400">|</span><br/>
<span className="text-blue-400">|</span> 1 <span className="text-blue-400">|</span> 🔴 Title <span className="text-blue-400">|</span> Change to "Hero" <span className="text-blue-400">|</span> Better UX <span className="text-blue-400">|</span>          <span className="text-blue-400">|</span><br/>
<span className="text-blue-400">|</span> 2 <span className="text-blue-400">|</span> 🟢 Color <span className="text-blue-400">|</span> Use #ff0000 <span className="text-blue-400">|</span> Contrast  <span className="text-blue-400">|</span>          <span className="text-blue-400">|</span>
                                        </div>
                                    </div>

                                    {/* After State: Interactive Table Mock with Copy Decisions */}
                                    <div className={`absolute inset-0 transition-all duration-700 ${demoState === 'after' ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-105 blur-sm z-0'}`}>
                                        <div className="bg-background rounded-xl overflow-hidden h-full border border-border shadow-sm flex flex-col">
                                            <div className="bg-secondary/50 px-3 py-2 border-b border-border grid grid-cols-12 gap-2 text-[10px] md:text-xs font-bold text-muted uppercase tracking-wider" dir="ltr">
                                                <div className="col-span-1 text-center">#</div>
                                                <div className="col-span-3">Item</div>
                                                <div className="col-span-4">Recommendation</div>
                                                <div className="col-span-4 text-center">Decision</div>
                                            </div>
                                            <div className="p-2.5 space-y-2 flex-1" dir="ltr">
                                                {/* Row 1: Accepted */}
                                                <div className="grid grid-cols-12 gap-2 items-center bg-green-500/5 border border-green-500/20 rounded-lg p-2 text-xs md:text-sm shadow-sm">
                                                    <div className="col-span-1 font-mono text-muted text-center">1</div>
                                                    <div className="col-span-3 font-medium flex items-center gap-1.5"><span className="text-[10px]">🔴</span> Title</div>
                                                    <div className="col-span-4 text-muted truncate text-[11px] md:text-xs">Change to "Hero"</div>
                                                    <div className="col-span-4 flex justify-center gap-1.5">
                                                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-green-500 flex items-center justify-center text-white shadow-sm"><Check className="w-4 h-4 md:w-5 md:h-5" /></div>
                                                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-secondary border border-border flex items-center justify-center text-muted opacity-30"><X className="w-4 h-4 md:w-5 md:h-5" /></div>
                                                    </div>
                                                </div>
                                                {/* Row 2: Pending */}
                                                <div className="grid grid-cols-12 gap-2 items-center bg-card border border-border rounded-lg p-2 text-xs md:text-sm hover:border-accent/30 transition-colors shadow-sm">
                                                    <div className="col-span-1 font-mono text-muted text-center">2</div>
                                                    <div className="col-span-3 font-medium flex items-center gap-1.5"><span className="text-[10px]">🟢</span> Color</div>
                                                    <div className="col-span-4 text-muted truncate text-[11px] md:text-xs">Use #ff0000</div>
                                                    <div className="col-span-4 flex justify-center gap-1.5">
                                                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500 shadow-sm"><Check className="w-4 h-4 md:w-5 md:h-5" /></div>
                                                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-sm"><X className="w-4 h-4 md:w-5 md:h-5" /></div>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Copy Decisions Footer */}
                                            <div className="px-3 py-2 border-t border-border bg-secondary/30 flex items-center justify-between" dir="ltr">
                                                <span className="text-[10px] md:text-xs text-muted font-medium">1/2 decided</span>
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/10 text-accent text-[10px] md:text-xs font-bold border border-accent/20">
                                                    <Copy className="w-3 h-3 md:w-3.5 md:h-3.5" />
                                                    Copy Decisions
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Try It Yourself: Real Sample */}
                            <div className="bg-accent/5 rounded-2xl p-5 border border-accent/20">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                                        <ClipboardPaste className="w-5 h-5 text-accent" />
                                        جربها بنفسك!
                                    </h3>
                                    <button 
                                        onClick={handleCopySample}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            isSampleCopied 
                                                ? 'bg-green-500 text-white border border-green-500' 
                                                : 'bg-accent text-white hover:bg-accent/90 border border-accent shadow-sm shadow-accent/20'
                                        }`}
                                    >
                                        {isSampleCopied ? <><Check className="w-3.5 h-3.5" /> تم النسخ!</> : <><Copy className="w-3.5 h-3.5" /> انسخ المثال</>}
                                    </button>
                                </div>
                                <p className="text-xs text-muted mb-3 leading-relaxed">
                                    انسخ الجدول ده وألصقه في الصفحة الرئيسية لتجربة وضع المراجعة مباشرة.
                                </p>
                                <div className="rounded-lg border border-border bg-[#1e1e1e] p-3 font-mono text-[10px] md:text-xs text-gray-400 leading-relaxed overflow-x-auto whitespace-pre text-left max-h-[100px]" dir="ltr">
{sampleMarkdown}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="shrink-0 p-4 border-t border-border bg-background sm:bg-secondary/20 flex justify-center pb-8 sm:pb-4">
                    <button 
                        onClick={onPaste}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-accent text-white rounded-xl font-bold shadow-lg shadow-accent/20 hover:shadow-accent/40 hover:-translate-y-0.5 transition-all text-lg sm:text-base"
                    >
                        جربها الآن — ألصق نص المراجعة
                        <MousePointerClick className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};
