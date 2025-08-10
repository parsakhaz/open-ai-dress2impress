'use client';
import { useCallback } from 'react';
import { Toaster, toast } from 'sonner';

export function useToast() {
  const showToast = useCallback(
    (
      message: string,
      type: 'success' | 'error' | 'info' = 'success',
      duration = 3000
    ) => {
      if (type === 'success') {
        toast.success(message, { duration });
      } else if (type === 'error') {
        toast.error(message, { duration });
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
