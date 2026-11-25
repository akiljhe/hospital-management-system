'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import ConfirmModal from '@/components/ConfirmModal';
import { PlusIcon, PillIcon, CheckIcon, AlertCircleIcon, XCircleIcon, SearchIcon } from '@/components/Icons';
import { formatDate, toLocalDateISO } from '@/lib/utils';

export default function MedicinesPage() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('semua');
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
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    nama_obat: '',
    deskripsi: '',
    tipe: 'biasa',
    stok: 100,
    tanggal_kadaluarsa: '',
  });

  useEffect(() => {
    loadMedicines(activeFilter);
  }, [activeFilter]);

  async function loadMedicines(filter) {
    setLoading(true);
    try {
      const url = filter === 'semua' ? '/api/medicines' : `/api/medicines?filter=${filter}`;
      const res = await fetch(url);
      const json = await res.json();
      setMedicines(json.medicines || json.data || []);
    } catch (err) {
      console.error('Failed to load medicines:', err);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingMedicine(null);
    setFormData({
      nama_obat: '',
      deskripsi: '',
      tipe: 'biasa',
      stok: 100,
      tanggal_kadaluarsa: '',
    });
    setIsModalOpen(true);
  }

  function openEditModal(med) {
    setEditingMedicine(med);
    setFormData({
      nama_obat: med.nama_obat || med.name || '',
      deskripsi: med.deskripsi || med.description || '',
      tipe: med.tipe || 'biasa',
      stok: med.stok !== undefined ? med.stok : (med.stock || 0),
      tanggal_kadaluarsa: med.tanggal_kadaluarsa
        ? med.tanggal_kadaluarsa.substring(0, 10)
        : '',
    });
    setIsModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingMedicine ? `/api/medicines/${editingMedicine.id}` : '/api/medicines';
      const method = editingMedicine ? 'PUT' : 'POST';

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
        message: editingMedicine ? 'Data obat berhasil diperbarui' : 'Obat baru berhasil ditambahkan',
        type: 'success',
      });
      setIsModalOpen(false);
      loadMedicines(activeFilter);
    } catch {
      setToast({ message: 'Terjadi kesalahan server', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  function handleDelete(id, name) {
    setConfirmConfig({
      title: 'Hapus Data Obat?',
      message: `Apakah Anda yakin ingin menghapus data obat "${name}"? Data yang dihapus tidak dapat dikembalikan.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      type: 'danger',
      onConfirm: () => executeDelete(id, name),
    });
  }

  async function executeDelete(id) {

    try {
      const res = await fetch(`/api/medicines/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || 'Gagal menghapus obat', type: 'error' });
        return;
      }

      setToast({ message: 'Obat berhasil dihapus', type: 'success' });
      loadMedicines(activeFilter);
    } catch {
      setToast({ message: 'Terjadi kesalahan server', type: 'error' });
    }
  }

  const todayStr = toLocalDateISO();

  const filteredMedicines = medicines.filter((m) => {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchName = (m.nama_obat || m.name || '').toLowerCase().includes(term);
      const matchDesc = (m.deskripsi || '').toLowerCase().includes(term);
      return matchName || matchDesc;
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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2.5 py-1 rounded-md mb-2">
            Inventori Medis
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Gudang Obat & Stok Farmasi
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pantau ketersediaan stok, obat habis, serta peringatan obat kadaluarsa secara real-time.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all self-start sm:self-auto cursor-pointer"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Tambah Obat Baru</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'semua', label: 'Semua Obat' },
            { key: 'tersedia', label: 'Tersedia' },
            { key: 'tidak_tersedia', label: 'Habis' },
            { key: 'kadaluarsa', label: 'Kadaluarsa' },
          ].map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100/70 border border-slate-200/80'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari obat..."
            className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
          />
          <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filteredMedicines.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 text-slate-500 shadow-2xs">
          <PillIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-800">Tidak ada data obat pada filter ini.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-[11px] uppercase font-bold text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-5">Nama Obat & Deskripsi</th>
                  <th className="py-3.5 px-5">Golongan</th>
                  <th className="py-3.5 px-5">Stok Fisik</th>
                  <th className="py-3.5 px-5">Tanggal Kadaluarsa</th>
                  <th className="py-3.5 px-5">Status Stok</th>
                  <th className="py-3.5 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMedicines.map((med) => {
                  const isExpired =
                    med.tanggal_kadaluarsa && med.tanggal_kadaluarsa.substring(0, 10) < todayStr;
                  const isOutOfStock = med.stok === 0;

                  return (
                    <tr
                      key={med.id}
                      className={`hover:bg-slate-50/50 transition-colors ${
                        isExpired
                          ? 'bg-rose-50/30'
                          : isOutOfStock
                          ? 'bg-amber-50/30'
                          : ''
                      }`}
                    >
                      <td className="py-4 px-5">
                        <div className="font-extrabold text-slate-900 text-sm">{med.nama_obat || med.name}</div>
                        <div className="text-xs text-slate-400 max-w-xs truncate mt-0.5">
                          {med.deskripsi || '-'}
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            med.tipe === 'keras'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                              : 'bg-blue-50 text-blue-700 border border-blue-200/60'
                          }`}
                        >
                          Obat {med.tipe || 'Biasa'}
                        </span>
                      </td>

                      <td className="py-4 px-5 font-mono font-bold">
                        <span className={`text-sm ${isOutOfStock ? 'text-rose-600 font-black' : 'text-slate-900'}`}>
                          {med.stok} pcs
                        </span>
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap text-xs">
                        {med.tanggal_kadaluarsa ? (
                          <span
                            className={
                              isExpired
                                ? 'text-rose-700 font-bold bg-rose-100 px-2.5 py-0.5 rounded-lg'
                                : 'text-slate-700'
                            }
                          >
                            {formatDate(med.tanggal_kadaluarsa)}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-extrabold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircleIcon className="w-3 h-3" />
                            <span>Kadaluarsa</span>
                          </span>
                        ) : isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-extrabold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertCircleIcon className="w-3 h-3" />
                            <span>Stok Habis</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-extrabold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckIcon className="w-3 h-3" />
                            <span>Tersedia</span>
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <button
                          onClick={() => openEditModal(med)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded-xl text-xs font-bold mr-2 transition-colors cursor-pointer"
                        >
                          Ubah
                        </button>
                        <button
                          onClick={() => handleDelete(med.id, med.nama_obat || med.name)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Form Obat */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMedicine ? 'Edit Data Obat' : 'Tambah Obat Baru'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nama Obat & Dosis *
            </label>
            <input
              type="text"
              value={formData.nama_obat}
              onChange={(e) => setFormData({ ...formData, nama_obat: e.target.value })}
              placeholder="cth. Paracetamol 500 mg"
              required
              className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Golongan Obat *
              </label>
              <select
                value={formData.tipe}
                onChange={(e) => setFormData({ ...formData, tipe: e.target.value })}
                className="w-full text-xs bg-white rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="biasa">Biasa (Bebas / Bebas Terbatas)</option>
                <option value="keras">Keras (Resep Dokter)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Stok Fisik *
              </label>
              <input
                type="number"
                min="0"
                value={formData.stok}
                onChange={(e) => setFormData({ ...formData, stok: parseInt(e.target.value, 10) || 0 })}
                required
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Tanggal Kadaluarsa
            </label>
            <input
              type="date"
              value={formData.tanggal_kadaluarsa}
              onChange={(e) => setFormData({ ...formData, tanggal_kadaluarsa: e.target.value })}
              className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Deskripsi & Indikasi Obat
            </label>
            <textarea
              rows={3}
              value={formData.deskripsi}
              onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
              placeholder="Indikasi pemakaian, dosis lazim, efek samping..."
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
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Obat'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
