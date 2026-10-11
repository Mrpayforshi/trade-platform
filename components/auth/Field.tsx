import type { InputHTMLAttributes } from "react";

export const inputCls =
  "w-full rounded-md border border-line bg-card px-3 py-2.5 text-[15px] text-ink placeholder:text-mute focus:border-ink focus:outline-none";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

export function Field({ label, hint, id, ...input }: Props) {
  const fieldId = id ?? input.name;
  return (
    <div>
      <label htmlFor={fieldId} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <input id={fieldId} className={inputCls} {...input} />
      {hint ? <p className="mt-1 text-[13px] text-mute">{hint}</p> : null}
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md border border-brick bg-card px-3 py-2 text-sm text-brick">
      {message}
    </p>
  );
}
