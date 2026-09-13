"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Labeled input with help text + error */
export const Field = forwardRef<
  HTMLInputElement,
  {
    label: string;
    error?: string;
    hint?: string;
    id: string;
    children?: React.ReactNode;
    className?: string;
  } & React.ComponentProps<typeof Input>
>(function Field({ label, error, hint, id, className, children, ...props }, ref) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label
        htmlFor={id}
        className="text-[13px] font-semibold text-neutral-300"
      >
        {label}
        {props.required && <span className="ms-1 text-primary">*</span>}
      </Label>
      {children ?? (
        <Input
          ref={ref}
          id={id}
          aria-invalid={!!error}
          className={cn(
            "input-premium h-11 rounded-lg text-[14px] text-neutral-100 placeholder:text-neutral-600",
            error && "border-danger/50",
            className
          )}
          {...props}
        />
      )}
      {error ? (
        <p className="text-xs font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-neutral-600">{hint}</p>
      ) : null}
    </div>
  );
});

/** Password input with visibility toggle */
export const PasswordField = forwardRef<
  HTMLInputElement,
  {
    label: string;
    error?: string;
    hint?: string;
    id: string;
    className?: string;
  } & React.ComponentProps<typeof Input>
>(function PasswordField({ label, error, hint, id, className, ...props }, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} error={error} hint={hint} id={id} className={className}>
      <div className="relative">
        <Input
          ref={ref}
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={!!error}
          className={cn(
            "input-premium h-11 rounded-lg pe-11 text-[14px] text-neutral-100 placeholder:text-neutral-600",
            error && "border-danger/50"
          )}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 end-0 flex w-11 items-center justify-center text-neutral-600 transition-colors hover:text-neutral-300"
        >
          {visible ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
        </button>
      </div>
    </Field>
  );
});

/** Primary gold submit button with pending state */
export function SubmitButton({
  children,
  pending,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { pending?: boolean }) {
  return (
    <Button
      type="submit"
      size="block"
      disabled={props.disabled || pending}
      className={cn("text-[13px] font-extrabold tracking-wider", className)}
      {...props}
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" aria-hidden>
      <path fill="#EA4335" d="M12 5.04c1.62 0 3.06.56 4.2 1.65l3.13-3.13C17.63 1.56 15.03.5 12 .5 7.63.5 3.86 3.01 2.05 6.72l3.66 2.84C6.6 6.86 9.03 5.04 12 5.04Z" />
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.44c-.28 1.5-1.12 2.77-2.4 3.62l3.7 2.87c2.16-1.99 3.76-4.93 3.76-8.68Z" />
      <path fill="#FBBC05" d="M5.71 14.29a7.2 7.2 0 0 1 0-4.58L2.05 6.72a11.5 11.5 0 0 0 0 10.43l3.66-2.86Z" />
      <path fill="#34A853" d="M12 23.5c3.03 0 5.57-1 7.43-2.72l-3.7-2.87c-1.03.7-2.35 1.1-3.73 1.1-2.97 0-5.4-1.82-6.29-4.28l-3.66 2.86C3.86 20.99 7.63 23.5 12 23.5Z" />
    </svg>
  );
}

/** Social provider buttons — production-ready OAuth targets */
export function SocialButtons({
  onGoogle,
  onFacebook,
  labels,
}: {
  onGoogle?: () => void;
  onFacebook?: () => void;
  labels: { google: string; facebook: string };
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={onGoogle}
        className="flex h-11 items-center justify-center gap-2.5 rounded-lg border border-neutral-800 bg-[#111] text-[13px] font-semibold text-neutral-200 transition-all hover:border-neutral-600 hover:bg-[#161616] active:scale-[0.98]"
      >
        <GoogleIcon />
        <span className="truncate">{labels.google}</span>
      </button>
      <button
        type="button"
        onClick={onFacebook}
        className="flex h-11 items-center justify-center gap-2.5 rounded-lg border border-neutral-800 bg-[#111] text-[13px] font-semibold text-neutral-200 transition-all hover:border-neutral-600 hover:bg-[#161616] active:scale-[0.98]"
      >
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="#1877F2" aria-hidden>
          <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.55-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.5h-2.8V24C19.61 23.1 24 18.1 24 12.07Z" />
        </svg>
        <span className="truncate">{labels.facebook}</span>
      </button>
    </div>
  );
}

/** OR separator */
export function OrSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-neutral-800" />
      <span className="text-[11px] font-bold tracking-[0.2em] text-neutral-600">{label}</span>
      <div className="h-px flex-1 bg-neutral-800" />
    </div>
  );
}
