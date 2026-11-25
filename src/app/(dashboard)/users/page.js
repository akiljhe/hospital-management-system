'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import ConfirmModal from '@/components/ConfirmModal';
import { PlusIcon, UsersIcon, PhoneIcon, SearchIcon } from '@/components/Icons';

export default function UsersManagementPage() {
  const [users, setUsers] = useState([]);
  const [polyclinics, setPolyclinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('semua');
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState(null);
  const [confirmConfig, setConfirmConfig] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  function closeConfirm() {
    if (!confirmLoading) setConfirmConfig(null);
  }

  async function runConfirm() {
    if (!confirmConfig?.onConfirm) return;
    setConfirmLoading(true);
    try {
      await confirmConfig.onConfirm();
    } finally {
      setConfirmLoading(false);
      setConfirmConfig(null);
    }
  }

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    nama_lengkap: '',
    email: '',
    username: '',
    password: '',
    role: 'pasien',
    telepon: '',
    alamat: '',
    poli_id: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [uRes, pRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/polyclinics'),
      ]);
      const uJson = await uRes.json();
      const pJson = await pRes.json();
      setUsers(uJson.users || uJson.data || []);
      setPolyclinics(pJson.polyclinics || pJson.data || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingUser(null);
    setFormData({
      nama_lengkap: '',
      email: '',
      username: '',
      password: '',
      role: 'pasien',
      telepon: '',
      alamat: '',
      poli_id: '',
    });
    setIsModalOpen(true);
  }

  function openEditModal(user) {
    setEditingUser(user);
    setFormData({
      nama_lengkap: user.nama_lengkap || user.name || '',
      email: user.email || '',
      username: user.username || '',
      password: '',
      role: user.role || 'pasien',
      telepon: user.telepon || user.phone || '',
      alamat: user.alamat || user.address || '',
      poli_id: user.poli_id || '',
    });
    setIsModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || 'Operasi gagal', type: 'error' });
        return;
      }

      setToast({
        message: editingUser ? 'Data pengguna berhasil diperbarui' : 'Pengguna baru berhasil ditambahkan',
        type: 'success',
      });
      setIsModalOpen(false);
      loadData();
    } catch {
      setToast({ message: 'Terjadi kesalahan server', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  function handleDelete(userId, userName) {
    setConfirmConfig({
      title: 'Hapus Pengguna?',
      message: `Apakah Anda yakin ingin menghapus pengguna "${userName}"? Akun ini akan kehilangan akses ke sistem secara permanen.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      type: 'danger',
      onConfirm: () => executeDelete(userId),
    });
  }

  async function executeDelete(userId) {

    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || 'Gagal menghapus user', type: 'error' });
        return;
      }

      setToast({ message: 'User berhasil dihapus', type: 'success' });
      loadData();
    } catch {
      setToast({ message: 'Terjadi kesalahan server', type: 'error' });
    }
  }

  if (loading) return <LoadingSpinner />;

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'semua' && u.role !== roleFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchName = (u.nama_lengkap || u.name || '').toLowerCase().includes(term);
      const matchUser = (u.username || '').toLowerCase().includes(term);
      const matchEmail = (u.email || '').toLowerCase().includes(term);
      return matchName || matchUser || matchEmail;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <ConfirmModal
        isOpen={!!confirmConfig}
        onClose={closeConfirm}
        onConfirm={runConfirm}
        title={confirmConfig?.title}
        message={confirmConfig?.message}
        confirmText={confirmConfig?.confirmText}
        cancelText={confirmConfig?.cancelText}
        type={confirmConfig?.type}
        loading={confirmLoading}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-1 rounded-md mb-2">
            Hak Akses & Pengguna
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Manajemen Pengguna
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola data akun dokter spesialis, pasien terdaftar, dan administrator rumah sakit.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all self-start sm:self-auto cursor-pointer"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Tambah Pengguna Baru</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Role Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {['semua', 'dokter', 'pasien', 'admin'].map((role) => {
            const count =
              role === 'semua' ? users.length : users.filter((u) => u.role === role).length;
            const isActive = roleFilter === role;

            return (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold capitalize transition-all flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100/70 border border-slate-200/80'
                }`}
              >
                <span>{role === 'semua' ? 'Semua Role' : role}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                    isActive ? 'bg-indigo-800 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            aria-label="Cari nama, email, atau username pengguna"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama, email, username..."
            className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
          />
          <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Tabel Users */}
      {filteredUsers.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 text-slate-500 shadow-2xs">
          <UsersIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-800">Tidak ada pengguna yang cocok dengan kriteria filter.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-[11px] uppercase font-bold text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-5">Nama & Profil</th>
                  <th className="py-3.5 px-5">Email & Kontak</th>
                  <th className="py-3.5 px-5">Role Akses</th>
                  <th className="py-3.5 px-5">Penugasan Poli</th>
                  <th className="py-3.5 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-slate-100 to-slate-200 text-slate-700 font-extrabold text-xs shadow-2xs">
                          {u.nama_lengkap?.charAt(0)?.toUpperCase() || u.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 text-sm">{u.nama_lengkap || u.name}</div>
                          <div className="text-xs text-slate-400 font-mono">@{u.username}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <div className="text-xs font-mono font-medium text-slate-700">{u.email}</div>
                      {u.telepon && (
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <PhoneIcon className="w-3.5 h-3.5" />
                          <span>{u.telepon}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold capitalize ${
                          u.role === 'admin'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200/50'
                            : u.role === 'dokter'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200/50'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          u.role === 'admin' ? 'bg-purple-500' : u.role === 'dokter' ? 'bg-blue-500' : 'bg-emerald-500'
                        }`} />
                        {u.role}
                      </span>
                    </td>

                    <td className="py-4 px-5 text-xs">
                      {u.role === 'dokter' ? (
                        u.polyclinic_name ? (
                          <span className="font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                            {u.polyclinic_name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Belum diatur</span>
                        )
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <button
                        onClick={() => openEditModal(u)}
                        className="px-3 py-2 min-h-[32px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded-xl text-xs font-bold mr-2 transition-colors cursor-pointer"
                      >
                        Ubah
                      </button>
                      <button
                        onClick={() => handleDelete(u.id, u.nama_lengkap || u.name)}
                        className="px-3 py-2 min-h-[32px] bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Tambah/Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Edit Data Pengguna' : 'Tambah Pengguna Baru'}
      >
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
              className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Username
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                disabled={!!editingUser}
                placeholder="Username akun"
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Role Pengguna *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full text-xs bg-white rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="pasien">Pasien</option>
                <option value="dokter">Dokter</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            {formData.role === 'dokter' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Poli Dokter *
                </label>
                <select
                  value={formData.poli_id}
                  onChange={(e) => setFormData({ ...formData, poli_id: e.target.value })}
                  required
                  className="w-full text-xs bg-white rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Pilih Poli --</option>
                  {polyclinics.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama_poli || p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nomor Telepon
            </label>
            <input
              type="text"
              value={formData.telepon}
              onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
              placeholder="0812xxxxxxxx"
              className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {editingUser ? 'Password Baru (Kosongkan bila tidak diubah)' : 'Password *'}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!editingUser}
              placeholder={editingUser ? '••••••••' : 'Minimal 6 karakter'}
              className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Menyimpan...' : 'Simpan User'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
