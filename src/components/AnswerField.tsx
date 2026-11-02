import { useEffect, useRef } from 'react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Optional override so Enter can submit the DOM text immediately. */
  onSubmit: (value?: string) => void;
  labelledBy: string;
  placeholder?: string;
  /** Bumps when the card changes so the field remounts clean. */
  resetKey: string;
};

function placeCaretAtEnd(el: HTMLElement) {
  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(el);
  range.collapse(false);
  sel?.removeAllRanges();
  sel?.addRange(range);
}

function cleanEditableText(raw: string): string {
  return raw
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\n|\r/g, '');
}

/**
 * contenteditable answer box — native <input> still gets Safari form-history
 * suggestions for previously typed German answers (e.g. "leider"); this does not.
 */
export function AnswerField({
  value,
  onChange,
  onSubmit,
  labelledBy,
  placeholder,
  resetKey,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.textContent = value;
    el.focus();
    placeCaretAtEnd(el);
    // Only remount/reset when the card changes
    // eslint-disable-next-line react-hooks/exhaustive-deps -- value cleared with resetKey
  }, [resetKey]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Sync umlaut-button inserts without fighting normal typing
    if ((el.textContent ?? '') !== value) {
      el.textContent = value;
      el.focus();
      placeCaretAtEnd(el);
    }
  }, [value]);

  return (
    <div
      ref={ref}
      className={`answer-input answer-editable${value ? '' : ' is-empty'}`}
      role="textbox"
      aria-multiline="false"
      aria-labelledby={labelledBy}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-placeholder={placeholder ?? ''}
      onInput={(e) => {
        const text = cleanEditableText(e.currentTarget.textContent ?? '');
        onChange(text);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          // Pass DOM text directly — React state may not have flushed yet
          const text = cleanEditableText(ref.current?.textContent ?? '');
          onChange(text);
          onSubmit(text);
        }
      }}
      onPaste={(e) => {
        e.preventDefault();
        const text = cleanEditableText(
          e.clipboardData.getData('text/plain'),
        );
        onChange(text);
      }}
    />
  );
}
