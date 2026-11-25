'use client';

import { useEffect } from 'react';
import ErrorState from '@/components/ui/ErrorState';

export default function Error({ error, reset }) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('Runtime application error:', error);
    }
  }, [error]);

  return (
    <ErrorState
      code="500"
      title="Terjadi kesalahan pada sistem"
      description="Mohon maaf atas ketidaknyamanannya. Sistem mengalami kendala sementara saat memproses permintaan Anda. Silakan coba beberapa saat lagi."
      onRetry={() => reset()}
      retryLabel="Coba lagi"
      primaryAction={{ label: 'Kembali ke Beranda', href: '/' }}
    />
  );
}
