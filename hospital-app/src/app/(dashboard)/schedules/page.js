'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { PlusIcon, XIcon, ClockIcon } from '@/components/Icons';

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [hari, setHari] = useState('Senin');
  const [jamMulai, setJamMulai] = useState('08:00');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const meRes = await fetch('/api/auth/me');
      const meJson = await meRes.json();
      const currentUser = meJson.user || meJson.data;
      setUser(currentUser);

      const schRes = await fetch(`/api/schedules?doctor_id=${currentUser.id}`);
      const schJson = await schRes.json();
      setSchedules(schJson.schedules || schJson.data || []);
    } catch (err) {
      console.error('Failed to load schedules:', err);
    } finally {
      setLoading(false);
    }
  }

  // Hitung otomatis jam selesai 30 menit kemudian
  function calculateEndTime(startTime) {
    if (!startTime) return '08:30';
    const [h, m] = startTime.split(':').map(Number);
    let endH = h;
    let endM = m + 30;
    if (endM >= 60) {
      endH = (endH + 1) % 24;
      endM = 0;
    }
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hari,
          jam_mulai: jamMulai,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || 'Gagal menambahkan jadwal', type: 'error' });
        return;
      }

      setToast({ message: 'Slot praktik 30 menit berhasil ditambahkan', type: 'success' });
      setIsModalOpen(false);
      loadData();
    } catch {
      setToast({ message: 'Terjadi kesalahan server', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus slot jadwal ini?')) return;

    try {
      const res = await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || 'Gagal menghapus jadwal', type: 'error' });
        return;
      }

      setToast({ message: 'Jadwal berhasil dihapus', type: 'success' });
      loadData();
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
            Manajemen Waktu Dokter
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Jadwal Praktik Dokter
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Atur ketersediaan slot konsultasi Anda. Durasi setiap sesi adalah tepat 30 menit dan dilarang bentrok.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all self-start sm:self-auto cursor-pointer"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Tambah Slot 30 Menit</span>
        </button>
      </div>

      {/* Grid Mingguan (Senin - Minggu) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {DAYS.map((day) => {
          const daySchedules = schedules.filter((s) => (s.hari || s.day) === day);

          return (
            <div key={day} className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                  <h3 className="font-extrabold text-base text-slate-900">{day}</h3>
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                    daySchedules.length > 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {daySchedules.length} slot
                  </span>
                </div>

                {daySchedules.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-8 text-center">Libur / Tidak ada jadwal</p>
                ) : (
                  <div className="space-y-2">
                    {daySchedules.map((s) => (
                      <div
                        key={s.id}
                        className="p-3 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-white hover:border-slate-200 transition-all flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-mono font-bold text-indigo-700">
                            {(s.jam_mulai || s.start_time)?.substring(0, 5)} -{' '}
                            {(s.jam_selesai || s.end_time)?.substring(0, 5)}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Slot Konsultasi 30 Min</p>
                        </div>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                          title="Hapus slot ini"
                        >
                          <XIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Tambah Jadwal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Tambah Slot Jadwal Praktik">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Hari Praktik *
            </label>
            <select
              value={hari}
              onChange={(e) => setHari(e.target.value)}
              className="w-full text-xs bg-white rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Waktu Mulai Konsultasi (Menit :00 atau :30) *
            </label>
            <input
              type="time"
              step="1800"
              value={jamMulai}
              onChange={(e) => setJamMulai(e.target.value)}
              required
              className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold"
            />
            <p className="text-xs text-slate-500 mt-1">
              Waktu selesai otomatis: <b className="text-indigo-600 font-mono">{calculateEndTime(jamMulai)}</b> (Durasi tepat 30 menit)
            </p>
          </div>

          <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100 text-xs text-indigo-800">
            ℹ️ Sistem secara ketat memeriksa bentrok jadwal pada hari dan jam yang sama.
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
              {submitting ? 'Menyimpan...' : 'Simpan Slot'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
