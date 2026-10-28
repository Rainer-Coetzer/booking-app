import type { InputHTMLAttributes, ReactNode } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
};

export function Field({ name, label, hint, error, id = name, ...input }: Props) {
  const described = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input id={id} name={name} className="input" aria-invalid={Boolean(error)} aria-describedby={described} {...input} />
      {hint && (
        <span className="hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
      {error && (
        <span className="error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </div>
  );
}
