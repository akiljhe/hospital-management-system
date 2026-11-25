'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import ConfirmModal from '@/components/ConfirmModal';
import { CalendarIcon, CheckIcon, XIcon } from '@/components/Icons';
import { formatDate } from '@/lib/utils';

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Semua');
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

  // Modal Reject
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [meRes, appRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/appointments'),
      ]);

      const meJson = await meRes.json();
      const appJson = await appRes.json();

      setUser(meJson.user || meJson.data);
      setAppointments(appJson.appointments || appJson.data || []);
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleApprove(appointmentId) {
    setConfirmConfig({
      title: 'Setujui Janji Temu?',
      message: 'Apakah Anda yakin ingin menyetujui (Approve) janji temu ini? Pasien akan menerima notifikasi persetujuan.',
      confirmText: 'Ya, Setujui',
      cancelText: 'Batal',
      type: 'success',
      onConfirm: () => executeApprove(appointmentId),
    });
  }

  async function executeApprove(appointmentId) {

    setActionLoading(true);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Approved' }),
      });

      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || 'Gagal menyetujui janji temu', type: 'error' });
        return;
      }

      setToast({ message: 'Janji temu berhasil disetujui (Approved)', type: 'success' });
      loadData();
    } catch {
      setToast({ message: 'Terjadi kesalahan server', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRejectSubmit(e) {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setToast({ message: 'Alasan penolakan wajib diisi', type: 'error' });
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/appointments/${selectedAppointment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Rejected',
          alasan_penolakan: rejectionReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || 'Gagal menolak janji temu', type: 'error' });
        return;
      }

      setToast({ message: 'Janji temu berhasil ditolak', type: 'success' });
      setRejectModalOpen(false);
      setRejectionReason('');
      setSelectedAppointment(null);
      loadData();
    } catch {
      setToast({ message: 'Terjadi kesalahan server', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  }

  function handleCancel(appointmentId) {
    setConfirmConfig({
      title: 'Batalkan Janji Temu?',
      message: 'Apakah Anda yakin ingin membatalkan janji temu ini? Tindakan ini tidak dapat dibatalkan.',
      confirmText: 'Ya, Batalkan',
      cancelText: 'Batal',
      type: 'danger',
      onConfirm: () => executeCancel(appointmentId),
    });
  }

  async function executeCancel(appointmentId) {

    setActionLoading(true);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Dibatalkan' }),
      });

      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || 'Gagal membatalkan janji temu', type: 'error' });
        return;
      }

      setToast({ message: 'Janji temu berhasil dibatalkan', type: 'success' });
      loadData();
    } catch {
      setToast({ message: 'Terjadi kesalahan server', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  const tabs = ['Semua', 'Pending', 'Approved', 'Selesai', 'Rejected', 'Dibatalkan'];

  const filteredAppointments = appointments.filter((app) => {
    if (activeTab === 'Semua') return true;
    return app.status === activeTab;
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
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md mb-2">
            Manajemen Janji
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {user?.role === 'pasien' ? 'Daftar Janji Temu Saya' : 'Verifikasi & Jadwal Janji Temu'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {user?.role === 'pasien'
              ? 'Pantau permohonan janji temu, jadwal konsultasi, serta alasan bila ditolak.'
              : 'Verifikasi permohonan booking pasien sebelum konsultasi 30 menit dimulai.'}
          </p>
        </div>

        {user?.role === 'pasien' && (
          <Link
            href="/appointments/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all self-start sm:self-auto cursor-pointer"
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Buat Janji Baru</span>
          </Link>
        )}
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200/80 pb-3">
        {tabs.map((tab) => {
          const count =
            tab === 'Semua'
              ? appointments.length
              : appointments.filter((a) => a.status === tab).length;

          const isActive = activeTab === tab;

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100/70 border border-slate-200/80'
              }`}
            >
              <span>{tab}</span>
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

      {/* Appointments Table / Cards */}
      {filteredAppointments.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 text-slate-500 shadow-2xs">
          <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-800">Tidak ada janji temu pada kategori "{activeTab}".</p>
          <p className="text-xs text-slate-400 mt-1">Data baru akan tampil di sini begitu ada aktivitas.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-[11px] uppercase font-bold text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-5">Tanggal & Jam Slot</th>
                  <th className="py-3.5 px-5">
                    {user?.role === 'pasien' ? 'Dokter Spesialis' : 'Pasien'}
                  </th>
                  <th className="py-3.5 px-5">
                    {user?.role === 'pasien' ? 'Keluhan Awal' : 'Dokter & Poli'}
                  </th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAppointments.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-5 whitespace-nowrap">
                      <div className="font-extrabold text-slate-900 text-sm">
                        {formatDate(app.tanggal_booking)}
                      </div>
                      <div className="text-xs font-mono text-indigo-600 font-bold mt-0.5">
                        {app.hari}, {app.jam_mulai?.substring(0, 5)} - {app.jam_selesai?.substring(0, 5)}
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      {user?.role === 'pasien' ? (
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{app.doctor_name}</div>
                          <div className="text-xs text-indigo-600 font-semibold">{app.polyclinic_name}</div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{app.patient_name}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{app.patient_phone || '-'}</div>
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-5">
                      {user?.role === 'pasien' ? (
                        <div className="max-w-xs text-xs text-slate-700 italic bg-slate-50 p-2 rounded-xl border border-slate-100">
                          {app.keluhan || app.keluhan_singkat || 'Tidak ada catatan'}
                        </div>
                      ) : (
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{app.doctor_name}</div>
                          <div className="text-xs text-indigo-600">{app.polyclinic_name}</div>
                          {(app.keluhan || app.keluhan_singkat) && (
                            <p className="text-[11px] text-slate-500 italic mt-1 max-w-xs truncate">
                              "{app.keluhan || app.keluhan_singkat}"
                            </p>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="py-4 px-5 whitespace-nowrap">
                      <StatusBadge status={app.status} />
                      {app.status === 'Rejected' && app.alasan_penolakan && (
                        <p className="text-[11px] text-rose-600 font-medium mt-1.5 max-w-xs">
                          Alasan: {app.alasan_penolakan}
                        </p>
                      )}
                    </td>

                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {/* Aksi Dokter & Admin saat status Pending */}
                        {(user?.role === 'dokter' || user?.role === 'admin') && app.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(app.id)}
                              disabled={actionLoading}
                              className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
                            >
                              <CheckIcon className="w-3.5 h-3.5" />
                              <span>Setujui</span>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedAppointment(app);
                                setRejectModalOpen(true);
                              }}
                              disabled={actionLoading}
                              className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
                            >
                              <XIcon className="w-3.5 h-3.5" />
                              <span>Tolak</span>
                            </button>
                          </>
                        )}

                        {/* Aksi Dokter saat status Approved -> Buat Rekam Medis */}
                        {user?.role === 'dokter' && app.status === 'Approved' && (
                          <Link
                            href={`/medical-records?appointment_id=${app.id}`}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all"
                          >
                            Tulis Rekam Medis
                          </Link>
                        )}

                        {/* Aksi Pasien saat status Pending -> Batalkan */}
                        {user?.role === 'pasien' && app.status === 'Pending' && (
                          <button
                            onClick={() => handleCancel(app.id)}
                            disabled={actionLoading}
                            className="px-3.5 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            Batalkan
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Alasan Penolakan */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => {
          setRejectModalOpen(false);
          setRejectionReason('');
        }}
        title="Tolak Permohonan Janji Temu"
      >
        <form onSubmit={handleRejectSubmit} className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Anda akan menolak janji temu untuk pasien{' '}
            <b className="text-slate-900">{selectedAppointment?.patient_name}</b> pada tanggal{' '}
            <b className="text-slate-900">
              {selectedAppointment && formatDate(selectedAppointment.tanggal_booking)}
            </b>
            . Berikan alasan penolakan yang jelas untuk pasien.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Alasan Penolakan (Wajib) *
            </label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Contoh: Dokter berhalangan hadir / Ada operasi darurat..."
              required
              className="w-full rounded-2xl border border-slate-300 p-3 text-xs text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setRejectModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={actionLoading || !rejectionReason.trim()}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
            >
              {actionLoading ? 'Menolak...' : 'Konfirmasi Tolak Janji'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
