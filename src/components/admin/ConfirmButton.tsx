'use client';

import type { ButtonHTMLAttributes } from 'react';

/** A submit button that asks first. For actions that cannot be undone. */
export default function ConfirmButton({ message, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { message: string }) {
  return (
    <button
      type="submit"
      {...props}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    />
  );
}
