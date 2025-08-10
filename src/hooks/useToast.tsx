'use client';
import { useCallback } from 'react';
import { Toaster, toast } from 'sonner';

export function useToast() {
  const showToast = useCallback(
    (
      message: string,
      type: 'success' | 'error' | 'info' | 'warning' = 'success',
      duration = 3000
    ) => {
      if (type === 'success') {
        toast.success(message, { duration });
      } else if (type === 'error') {
        toast.error(message, { duration });
      } else if (type === 'warning') {
        // Sonner supports toast.warning
        // @ts-expect-error - types may not expose warning explicitly in older versions
        toast.warning?.(message, { duration }) ?? toast(message, { duration });
      } else {
        toast.info(message, { duration });
      }
    },
    []
  );

  const ToastContainer = useCallback(
    () => (
      <Toaster
        position="top-right"
        richColors
        closeButton
        theme="system"
        offset={72}
      />
    ),
    []
  );

  return { showToast, ToastContainer };
}
