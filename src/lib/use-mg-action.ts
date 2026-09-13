"use client";

import { useActionState, useEffect, useRef } from "react";

/**
 * useActionState wrapper that runs side-effects (close dialog, toast,
 * refresh) inside the action itself instead of a useEffect —
 * the React 19 recommended pattern.
 */
export function useMgAction<T extends { ok: boolean; error?: string }>(
  action: (prev: T | null, formData: FormData) => Promise<T>,
  handlers: {
    onSuccess?: (res: T) => void;
    onError?: (res: T) => void;
  } = {}
) {
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  const [state, formAction, pending] = useActionState<T | null, FormData>(
    async (prev: T | null, formData: FormData) => {
      const res = await action(prev, formData);
      if (res.ok) {
        handlersRef.current.onSuccess?.(res);
      } else {
        handlersRef.current.onError?.(res);
      }
      return res;
    },
    null
  );

  return [state, formAction, pending] as const;
}
