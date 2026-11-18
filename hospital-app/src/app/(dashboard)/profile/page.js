'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import Toast from '@/components/Toast';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    nama_lengkap: '',
    email: '',
    telepon: '',
    alamat: '',
    password: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const res = await fetch('/api/profile');
      const json = await res.json();
      const u = json.user;
      setUser(u);
      setFormData({
        nama_lengkap: u.nama_lengkap || u.name || '',
        email: u.email || '',
        telepon: u.telepon || u.phone || '',
        alamat: u.alamat || u.address || '',
        password: '',
      });
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || 'Gagal menyimpan profil', type: 'error' });
        return;
      }

      setToast({ message: 'Profil Anda berhasil diperbarui!', type: 'success' });
      setFormData({ ...formData, password: '' });
      loadProfile();
    } catch {
      setToast({ message: 'Terjadi kesalahan server', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div>
        <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md mb-2">
          Akun Pribadi
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Profil Saya
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Perbarui data kontak pribadi, alamat domisili, atau perbarui kata sandi akun Anda.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        {/* Ringkasan User */}
        <div className="flex items-center gap-4 border-b border-slate-100 pb-6 mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white font-black text-2xl shadow-sm">
            {user?.nama_lengkap?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">{user?.nama_lengkap}</h2>
            <p className="text-xs text-slate-400 font-mono">@{user?.username}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200/50">
                Role: {user?.role}
              </span>
              {user?.role === 'dokter' && user?.polyclinic_name && (
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-50 text-blue-700 border border-blue-200/50">
                  Poli: {user.polyclinic_name}
                </span>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nama Lengkap *
            </label>
            <input
              type="text"
              value={formData.nama_lengkap}
              onChange={(e) => setFormData({ ...formData, nama_lengkap: e.target.value })}
              required
              className="w-full text-xs rounded-xl border border-slate-300 p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Alamat Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full text-xs rounded-xl border border-slate-300 p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nomor Telepon
            </label>
            <input
              type="text"
              value={formData.telepon}
              onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
              placeholder="08xxxxxxxxxx"
              className="w-full text-xs rounded-xl border border-slate-300 p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Alamat Domisili
            </label>
            <textarea
              rows={3}
              value={formData.alamat}
              onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
              placeholder="Alamat domisili lengkap..."
              className="w-full text-xs rounded-xl border border-slate-300 p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Ganti Password (Opsional)
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Biarkan kosong jika tidak ingin mengubah password"
              className="w-full text-xs rounded-xl border border-slate-300 p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
