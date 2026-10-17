import { useState, useCallback } from 'react';
import { Check, Copy } from 'lucide-react';

interface CodeBlockProps {
  className?: string;
  children?: React.ReactNode;
  node?: any;
}

// Arabic Unicode ranges: Arabic, Arabic Supplement, Arabic Extended-A, Presentation Forms-A/B
const ARABIC_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
const STRONG_CHAR_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿A-Za-z]/;

function detectCodeDir(code: string): 'rtl' | 'ltr' {
    const match = code.match(STRONG_CHAR_RE);
    if (match && ARABIC_RE.test(match[0])) return 'rtl';
    return 'ltr';
}

export const CodeBlock = ({ className, children }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const language = className?.replace(/^language-/, '') || '';
  const codeString = typeof children === 'string'
    ? children
    : String(children || '');

  const isInline = !className && !codeString.includes('\n');

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(codeString.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [codeString]);

  if (isInline) {
    return <code className={className}>{children}</code>;
  }

  return (
    <div className="code-block-wrapper" data-lang={language || undefined}>
      <button
        onClick={handleCopy}
        className={copied ? 'code-copy-btn copied' : 'code-copy-btn'}
        type="button"
        aria-label={copied ? 'Copied' : 'Copy code'}
        title={copied ? 'Copied' : 'Copy code'}
      >
        {copied ? <Check size={15} /> : <Copy size={15} />}
      </button>
      <pre dir={detectCodeDir(codeString)}>
        <code className={className}>
          {children}
        </code>
      </pre>
    </div>
  );
};

export default CodeBlock;
