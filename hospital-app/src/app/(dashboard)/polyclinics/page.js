'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { PlusIcon, PoliIcon } from '@/components/Icons';

export default function PolyclinicsManagementPage() {
  const [polyclinics, setPolyclinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPoli, setEditingPoli] = useState(null);
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    nama_poli: '',
    deskripsi: '',
    ikon: 'poli',
  });

  useEffect(() => {
    loadPolyclinics();
  }, []);

  async function loadPolyclinics() {
    try {
      const res = await fetch('/api/polyclinics');
      const json = await res.json();
      setPolyclinics(json.polyclinics || json.data || []);
    } catch (err) {
      console.error('Failed to load polyclinics:', err);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingPoli(null);
    setFormData({ nama_poli: '', deskripsi: '', ikon: 'poli' });
    setIsModalOpen(true);
  }

  function openEditModal(poli) {
    setEditingPoli(poli);
    setFormData({
      nama_poli: poli.nama_poli || poli.name || '',
      deskripsi: poli.deskripsi || poli.description || '',
      ikon: poli.ikon || poli.icon || 'poli',
    });
    setIsModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingPoli ? `/api/polyclinics/${editingPoli.id}` : '/api/polyclinics';
      const method = editingPoli ? 'PUT' : 'POST';

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
        message: editingPoli ? 'Poliklinik berhasil diperbarui' : 'Poliklinik baru berhasil ditambahkan',
        type: 'success',
      });
      setIsModalOpen(false);
      loadPolyclinics();
    } catch {
      setToast({ message: 'Terjadi kesalahan server', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Apakah Anda yakin ingin menghapus poliklinik "${name}"?`)) return;

    try {
      const res = await fetch(`/api/polyclinics/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || 'Gagal menghapus poliklinik', type: 'error' });
        return;
      }

      setToast({ message: 'Poliklinik berhasil dihapus', type: 'success' });
      loadPolyclinics();
    } catch {
      setToast({ message: 'Terjadi kesalahan server', type: 'error' });
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 pb-12">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md mb-2">
            Spesialisasi Klinis
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Data Poliklinik Rumah Sakit
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola data divisi poliklinik, deskripsi layanan, dan dokter spesialis yang bertugas.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all self-start sm:self-auto cursor-pointer"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Tambah Poli Baru</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {polyclinics.map((p) => (
          <div
            key={p.id}
            className="group p-6 rounded-3xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 group-hover:scale-105 transition-transform text-indigo-600">
                  <PoliIcon name={p.nama_poli || p.name} className="w-8 h-8" />
                </div>
                <span className="text-[10px] font-extrabold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full">
                  POLI-{p.id}
                </span>
              </div>
              <h3 className="font-extrabold text-lg text-slate-900">{p.nama_poli || p.name}</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">{p.deskripsi || p.description || '-'}</p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => openEditModal(p)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                Ubah
              </button>
              <button
                onClick={() => handleDelete(p.id, p.nama_poli || p.name)}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Form Poli */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPoli ? 'Edit Poliklinik' : 'Tambah Poliklinik Baru'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nama Poliklinik *
            </label>
            <input
              type="text"
              value={formData.nama_poli}
              onChange={(e) => setFormData({ ...formData, nama_poli: e.target.value })}
              placeholder="cth. Poli Jantung"
              required
              className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Kode / Kategori Ikon Poli
            </label>
            <input
              type="text"
              value={formData.ikon}
              onChange={(e) => setFormData({ ...formData, ikon: e.target.value })}
              placeholder="cth. umum, gigi, anak, jantung"
              className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Deskripsi & Cakupan Layanan
            </label>
            <textarea
              rows={3}
              value={formData.deskripsi}
              onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
              placeholder="Jelaskan jenis penanganan dan fasilitas poli ini..."
              className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
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
              {submitting ? 'Menyimpan...' : 'Simpan Poli'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
