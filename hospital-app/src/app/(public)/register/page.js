'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Footprints, Eye, EyeOff, Check, X, LoaderCircle } from 'lucide-react';
import Toast from '@/components/Toast';
import ShaderBackground from '@/components/ui/ShaderBackground';

const INPUT_CLASS =
  'w-full text-sm rounded-xl bg-slate-950/60 border border-white/10 text-white placeholder-slate-400 px-3.5 py-3 transition-colors focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30';
const LABEL_CLASS = 'block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5';

function EyeToggle({ visible, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
      aria-label={visible ? 'Sembunyikan password' : 'Tampilkan password'}
    >
      {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nama_lengkap: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    telepon: '',
    alamat: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const passwordsMatch = formData.password === formData.confirmPassword;
  const showMatchIndicator = formData.confirmPassword.length > 0;

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setToast({ message: 'Konfirmasi password tidak cocok', type: 'error' });
      return;
    }

    if (formData.password.length < 6) {
      setToast({ message: 'Password minimal 6 karakter', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || 'Pendaftaran gagal', type: 'error' });
        return;
      }

      setToast({ message: 'Pendaftaran berhasil! Mengalihkan ke dashboard...', type: 'success' });
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 700);
    } catch {
      setToast({ message: 'Terjadi kesalahan server', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative isolate min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-cyan-400/30 selection:text-white">
      <ShaderBackground className="-z-10" />
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
          Pendaftaran Pasien Baru
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Sudah terdaftar?{' '}
          <Link href="/login" className="font-bold text-cyan-300 hover:text-cyan-200 transition-colors">
            Masuk ke akun Anda
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg px-4 sm:px-0">
        <div className="relative overflow-hidden bg-slate-900/65 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_30px_-5px_rgba(99,102,241,0.3)] py-8 px-6 sm:px-9">
          {/* Top Border Glow Lightbeam */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent" />

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="nama_lengkap" className={LABEL_CLASS}>
                Nama Lengkap Pasien *
              </label>
              <input
                id="nama_lengkap"
                type="text"
                name="nama_lengkap"
                autoComplete="name"
                value={formData.nama_lengkap}
                onChange={handleChange}
                placeholder="cth. Ahmad Fauzi"
                required
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label htmlFor="email" className={LABEL_CLASS}>
                Alamat Email Aktif *
              </label>
              <input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="nama@email.com"
                required
                className={INPUT_CLASS}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="username" className={LABEL_CLASS}>
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  name="username"
                  autoComplete="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="ahmad_fauzi"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label htmlFor="telepon" className={LABEL_CLASS}>
                  Nomor Telepon
                </label>
                <input
                  id="telepon"
                  type="tel"
                  name="telepon"
                  autoComplete="tel"
                  value={formData.telepon}
                  onChange={handleChange}
                  placeholder="08123456789"
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div>
              <label htmlFor="alamat" className={LABEL_CLASS}>
                Alamat Domisili
              </label>
              <textarea
                id="alamat"
                name="alamat"
                rows={2}
                value={formData.alamat}
                onChange={handleChange}
                placeholder="Jl. Melati No. 12, Kota..."
                className={`${INPUT_CLASS} resize-none`}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="password" className={LABEL_CLASS}>
                  Password *
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min 6 karakter"
                    required
                    className={`${INPUT_CLASS} pr-11`}
                  />
                  <EyeToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className={LABEL_CLASS}>
                  Ulangi Password *
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    name="confirmPassword"
                    autoComplete="new-password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Ulangi password"
                    required
                    aria-describedby="password-match"
                    className={`${INPUT_CLASS} pr-11 ${
                      showMatchIndicator
                        ? passwordsMatch
                          ? 'border-emerald-400/60'
                          : 'border-rose-400/60'
                        : ''
                    }`}
                  />
                  <EyeToggle visible={showConfirm} onToggle={() => setShowConfirm((v) => !v)} />
                </div>
              </div>
            </div>

            <div id="password-match" aria-live="polite" className="min-h-5">
              {showMatchIndicator &&
                (passwordsMatch ? (
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                    <Check className="h-3.5 w-3.5" />
                    Password cocok
                  </p>
                ) : (
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-400">
                    <X className="h-3.5 w-3.5" />
                    Password tidak cocok
                  </p>
                ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full overflow-hidden flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-teal-500 shadow-lg shadow-indigo-900/40 hover:shadow-indigo-500/30 transition-shadow disabled:opacity-60 cursor-pointer"
            >
              <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent transition-[left] duration-700 ease-out group-hover:left-[120%]" />
              {loading && <LoaderCircle className="relative h-4 w-4 animate-spin" />}
              <span className="relative">{loading ? 'Mendaftarkan Akun...' : 'Daftar Akun Pasien'}</span>
            </button>
          </form>

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
