'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('Global root layout error:', error);
    }
  }, [error]);

  return (
    <html lang="id">
      <head>
        <title>Kesalahan Sistem | RS Digital Sehat</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          backgroundColor: '#020617',
          color: '#f1f5f9',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '500px',
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '24px',
            padding: '36px 28px',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
            <img
              src="/logo-rumah-sakit.svg"
              alt="Logo RS Digital Sehat"
              width={40}
              height={40}
              style={{ width: '40px', height: '40px', borderRadius: '12px' }}
            />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>RS Digital Sehat</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Sistem Layanan Rumah Sakit</div>
            </div>
          </div>

          <div style={{ fontSize: '64px', fontWeight: 900, color: '#2dd4bf', lineHeight: 1 }}>
            500
          </div>

          <h1 style={{ marginTop: '16px', marginBottom: '12px', fontSize: '22px', fontWeight: 800, color: '#ffffff' }}>
            Terjadi kesalahan pada sistem
          </h1>

          <p style={{ margin: '0 auto 28px', fontSize: '14px', color: '#cbd5e1', lineHeight: 1.6, maxWidth: '380px' }}>
            Mohon maaf, terjadi gangguan tak terduga pada sistem utama. Silakan muat ulang atau kembali ke beranda.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                minHeight: '44px',
                padding: '10px 24px',
                borderRadius: '12px',
                backgroundColor: '#0E7C86',
                color: '#ffffff',
                border: 'none',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Coba lagi
            </button>
            <a
              href="/"
              style={{
                minHeight: '44px',
                padding: '10px 24px',
                borderRadius: '12px',
                backgroundColor: '#1e293b',
                color: '#e2e8f0',
                border: '1px solid #334155',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
              }}
            >
              Kembali ke Beranda
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
