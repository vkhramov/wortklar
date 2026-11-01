import { useEffect, useRef } from 'react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
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
        const text = (e.currentTarget.textContent ?? '').replace(/\n/g, '');
        onChange(text);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onSubmit();
        }
      }}
      onPaste={(e) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain').replace(/\n/g, '');
        onChange(text);
      }}
    />
  );
}
