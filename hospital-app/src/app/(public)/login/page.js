'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Toast from '@/components/Toast';
import { WalkIcon, CrownIcon, StethoscopeIcon, UserIcon } from '@/components/Icons';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!identifier || !password) {
      setToast({ message: 'Email/username dan password wajib diisi', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: identifier, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || 'Login gagal', type: 'error' });
        return;
      }

      setToast({ message: 'Login berhasil! Mengalihkan ke dashboard...', type: 'success' });
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 500);
    } catch {
      setToast({ message: 'Terjadi kesalahan koneksi', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  function fillDemoAccount(demoUser, demoPass) {
    setIdentifier(demoUser);
    setPassword(demoPass);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-indigo-100 selection:text-indigo-900">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white font-black shadow-md group-hover:scale-105 transition-transform">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">
                RS Digital Sehat
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide bg-indigo-50 text-indigo-700 border border-indigo-200/50">
                2026
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium leading-none mt-1">
              Hospital Digitalization Platform
            </p>
          </div>
        </Link>
        <h2 className="mt-6 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Masuk ke Akun Anda
        </h2>
        <p className="mt-2 text-xs text-slate-500">
          Belum punya akun?{' '}
          <Link href="/register" className="font-bold text-indigo-600 hover:text-indigo-500">
            Daftar akun pasien baru
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-9 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] border border-slate-200/80 rounded-3xl">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email atau Username
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="cth. admin, dr_sarah, johndoe"
                required
                className="w-full text-xs rounded-xl border border-slate-300 p-3 text-slate-900 shadow-2xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full text-xs rounded-xl border border-slate-300 p-3 text-slate-900 shadow-2xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer mt-2"
            >
              {loading ? 'Memproses Masuk...' : 'Masuk ke Sistem'}
            </button>
          </form>

          {/* Tombol Lanjutkan sebagai Tamu (Guest Requirement) */}
          <div className="mt-6 border-t border-slate-100 pt-5">
            <Link
              href="/"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              <WalkIcon className="w-4 h-4 text-slate-500" />
              <span>Lanjutkan sebagai Tamu (Guest Mode)</span>
            </Link>
          </div>

          {/* Akun Demo Cepat */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
              Akun Uji Evaluasi (1-Klik Isi):
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemoAccount('admin', 'admin123')}
                className="py-2 px-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/60 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CrownIcon className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('dr_sarah', 'dokter123')}
                className="py-2 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/60 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <StethoscopeIcon className="w-3.5 h-3.5" />
                <span>Dokter</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('johndoe', 'pasien123')}
                className="py-2 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Pasien</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
