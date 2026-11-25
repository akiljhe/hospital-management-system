'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Footprints, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import Toast from '@/components/Toast';
import ShaderBackground from '@/components/ui/ShaderBackground';
import EkgBackground from '@/components/auth/EkgBackground';

const INPUT_CLASS =
  'w-full text-sm rounded-xl bg-slate-950/60 border border-white/10 text-white placeholder-slate-400 px-3.5 py-3 transition-colors focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30';
const LABEL_CLASS = 'block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  return (
    <div className="relative isolate min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-cyan-400/30 selection:text-white">
      <ShaderBackground className="-z-20" />
      <EkgBackground className="-z-10" />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4 sm:px-0">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-900/40 ring-1 ring-white/20 group-hover:scale-105 transition-transform">
            <Plus className="w-6 h-6" strokeWidth={2.75} />
          </div>
          <div className="text-left">
            <span className="block text-xl font-extrabold tracking-tight text-white leading-none">
              RS Digital Sehat
            </span>
            <p className="text-xs text-slate-400 font-medium leading-none mt-1.5">
              Hospital Digitalization Platform
            </p>
          </div>
        </Link>
        <h2 className="mt-7 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Masuk ke Akun Anda
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Belum punya akun?{' '}
          <Link href="/register" className="font-bold text-cyan-300 hover:text-cyan-200 transition-colors">
            Daftar akun pasien baru
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="relative overflow-hidden bg-slate-900/65 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_30px_-5px_rgba(99,102,241,0.3)] py-8 px-6 sm:px-9">
          {/* Top Border Glow Lightbeam */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent" />

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="identifier" className={LABEL_CLASS}>
                Email atau Username
              </label>
              <input
                id="identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Masukkan email atau username Anda"
                required
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label htmlFor="password" className={LABEL_CLASS}>
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className={`${INPUT_CLASS} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative mt-2 w-full overflow-hidden flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-teal-500 shadow-lg shadow-indigo-900/40 hover:shadow-indigo-500/30 transition-shadow disabled:opacity-60 cursor-pointer"
            >
              <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent transition-[left] duration-700 ease-out group-hover:left-[120%]" />
              {loading && <LoaderCircle className="relative h-4 w-4 animate-spin" />}
              <span className="relative">{loading ? 'Memproses Masuk...' : 'Masuk ke Sistem'}</span>
            </button>
          </form>

          {/* Tombol Lanjutkan sebagai Tamu (Guest Requirement) */}
          <div className="mt-6 border-t border-white/10 pt-5">
            <Link
              href="/"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              <Footprints className="w-4 h-4 text-slate-400" />
              <span>Lanjutkan sebagai Tamu (Guest Mode)</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
