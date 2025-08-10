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
        position="bottom-left"
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
