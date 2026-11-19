'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import Toast from '@/components/Toast';
import { CheckIcon, PoliIcon, DoctorIcon, CalendarIcon } from '@/components/Icons';

const DAY_MAP = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function getNextDatesForDay(dayName, count = 3) {
  const dayIndex = DAY_MAP.indexOf(dayName);
  if (dayIndex === -1) return [];

  const dates = [];
  const current = new Date();
  // start from tomorrow if today's day matches but already late, or from today
  for (let i = 0; i < 28 && dates.length < count; i++) {
    const d = new Date();
    d.setDate(current.getDate() + i);
    if (d.getDay() === dayIndex) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dates.push({
        iso: `${yyyy}-${mm}-${dd}`,
        label: d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }),
      });
    }
  }
  return dates;
}

function NewAppointmentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDoctorId = searchParams.get('doctor_id');

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Master data
  const [polyclinics, setPolyclinics] = useState([]);
  const [doctors, setDoctors] = useState([]);

  // Form selections
  const [selectedPoli, setSelectedPoli] = useState(null);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [keluhan, setKeluhan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [pRes, dRes] = await Promise.all([
          fetch('/api/polyclinics'),
          fetch('/api/doctors'),
        ]);
        const pJson = await pRes.json();
        const dJson = await dRes.json();

        const polis = pJson.polyclinics || pJson.data || [];
        const docs = dJson.doctors || dJson.data || [];
        setPolyclinics(polis);
        setDoctors(docs);

        if (initialDoctorId) {
          const doc = docs.find((d) => String(d.id) === String(initialDoctorId));
          if (doc) {
            setSelectedDoctor(doc);
            const poli = polis.find((p) => String(p.id) === String(doc.poli_id));
            if (poli) setSelectedPoli(poli);
            setStep(3);
          }
        }
      } catch (err) {
        console.error('Failed to load appointment wizard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [initialDoctorId]);

  const scheduleDay = selectedSchedule ? (selectedSchedule.day || selectedSchedule.hari) : '';
  const suggestedDates = useMemo(() => {
    if (!scheduleDay) return [];
    return getNextDatesForDay(scheduleDay, 3);
  }, [scheduleDay]);

  function handleDateChange(e) {
    const val = e.target.value;
    setAppointmentDate(val);

    if (val && selectedSchedule) {
      const [year, month, day] = val.split('-').map(Number);
      const chosenDayName = DAY_MAP[new Date(year, month - 1, day).getDay()];
      if (chosenDayName !== scheduleDay) {
        setToast({
          message: `Perhatian: Tanggal yang dipilih adalah hari ${chosenDayName}, sedangkan slot dokter ini untuk hari ${scheduleDay}.`,
          type: 'error',
        });
      }
    }
  }

  async function handleConfirm(e) {
    e.preventDefault();

    if (!selectedSchedule || !appointmentDate) {
      setToast({ message: 'Lengkapi jadwal dan tanggal janji temu', type: 'error' });
      return;
    }

    const [year, month, day] = appointmentDate.split('-').map(Number);
    const chosenDayName = DAY_MAP[new Date(year, month - 1, day).getDay()];

    if (chosenDayName !== scheduleDay) {
      setToast({
        message: `Tanggal ${appointmentDate} adalah hari ${chosenDayName}, bukan hari ${scheduleDay}.`,
        type: 'error',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jadwal_id: selectedSchedule.id,
          tanggal_booking: appointmentDate,
          keluhan: keluhan.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || 'Gagal membuat janji temu', type: 'error' });
        return;
      }

      setToast({ message: 'Janji temu berhasil dibuat! Menunggu konfirmasi dokter...', type: 'success' });
      setTimeout(() => {
        router.push('/appointments');
      }, 900);
    } catch {
      setToast({ message: 'Terjadi kesalahan server', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  const filteredDoctors = selectedPoli
    ? doctors.filter((d) => String(d.poli_id) === String(selectedPoli.id))
    : doctors;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Page Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md mb-2">
          Reservasi Online
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Buat Janji Temu Dokter
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Konsultasi terjadwal 30 menit per pasien. Sistem memastikan slot Anda anti-bentrok.
        </p>
      </div>

      {/* Modern Step Indicator */}
      <div className="grid grid-cols-3 gap-3">
        <div
          onClick={() => setStep(1)}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
            step === 1
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-600/20'
              : step > 1
              ? 'bg-white text-indigo-700 border-indigo-100 hover:bg-indigo-50/50'
              : 'bg-white text-slate-400 border-slate-200/80'
          }`}
        >
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
            step === 1 ? 'bg-white text-indigo-600' : step > 1 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'
          }`}>
            {step > 1 ? <CheckIcon className="w-3.5 h-3.5" /> : '1'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate">Pilih Poli</p>
            <p className={`text-[10px] truncate ${step === 1 ? 'text-indigo-200' : 'text-slate-400'}`}>
              {selectedPoli?.nama_poli || 'Layanan spesialis'}
            </p>
          </div>
        </div>

        <div
          onClick={() => {
            if (selectedPoli) setStep(2);
          }}
          className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
            step === 2
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-600/20'
              : step > 2
              ? 'bg-white text-indigo-700 border-indigo-100 hover:bg-indigo-50/50'
              : 'bg-white text-slate-400 border-slate-200/80'
          }`}
        >
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
            step === 2 ? 'bg-white text-indigo-600' : step > 2 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'
          }`}>
            {step > 2 ? <CheckIcon className="w-3.5 h-3.5" /> : '2'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate">Pilih Dokter</p>
            <p className={`text-[10px] truncate ${step === 2 ? 'text-indigo-200' : 'text-slate-400'}`}>
              {selectedDoctor?.name || 'Dokter praktik'}
            </p>
          </div>
        </div>

        <div
          className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3 ${
            step === 3
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-600/20'
              : 'bg-white text-slate-400 border-slate-200/80'
          }`}
        >
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
            step === 3 ? 'bg-white text-indigo-600' : 'bg-slate-100 text-slate-400'
          }`}>
            3
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate">Jadwal & Konfirmasi</p>
            <p className={`text-[10px] truncate ${step === 3 ? 'text-indigo-200' : 'text-slate-400'}`}>
              {appointmentDate || 'Slot 30 menit'}
            </p>
          </div>
        </div>
      </div>

      {/* STEP 1: PILIH POLIKLINIK */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Langkah 1: Pilih Poliklinik</h2>
            <span className="text-xs text-slate-400">{polyclinics.length} Poli Tersedia</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {polyclinics.map((p) => {
              const isSelected = selectedPoli?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    setSelectedPoli(p);
                    setStep(2);
                  }}
                  className={`group p-6 rounded-3xl bg-white border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-600 ring-2 ring-indigo-600/20 shadow-md'
                      : 'border-slate-200/80 hover:border-indigo-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-2xl bg-indigo-50/70 group-hover:scale-105 transition-transform text-indigo-600">
                      <PoliIcon name={p.nama_poli || p.name} className="w-8 h-8" />
                    </div>
                    <span className="text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">
                      Pilih →
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {p.nama_poli || p.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {p.deskripsi || p.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 2: PILIH DOKTER */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Langkah 2: Pilih Dokter Spesialis</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Poliklinik:{' '}
                <span className="font-bold text-indigo-600">{selectedPoli?.nama_poli || selectedPoli?.name}</span>
              </p>
            </div>
            <button
              onClick={() => setStep(1)}
              className="text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              ← Ganti Poli
            </button>
          </div>

          {filteredDoctors.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80">
              <DoctorIcon className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">Belum ada dokter yang bertugas di poli ini.</p>
              <button
                onClick={() => setStep(1)}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Pilih Poliklinik Lain
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredDoctors.map((doc) => {
                const isSelected = selectedDoctor?.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => {
                      setSelectedDoctor(doc);
                      setStep(3);
                    }}
                    className={`group p-6 rounded-3xl bg-white border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-600 ring-2 ring-indigo-600/20 shadow-md'
                        : 'border-slate-200/80 hover:border-indigo-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white font-black text-lg shadow-sm">
                        {doc.name?.charAt(0) || 'D'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-base text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {doc.name || doc.nama_lengkap}
                        </h3>
                        <p className="text-xs text-indigo-600 font-semibold mt-0.5">
                          {doc.polyclinic_name || doc.nama_poli}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {doc.schedules?.length || 0} slot jadwal mingguan
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600">
                      <span>Pilih Dokter & Jadwal</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* STEP 3: PILIH JADWAL & KONFIRMASI */}
      {step === 3 && (
        <form onSubmit={handleConfirm} className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Langkah 3: Pilih Slot Jadwal & Tanggal</h2>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              ← Ganti Dokter
            </button>
          </div>

          {/* Selected Doctor Summary Card */}
          <div className="p-5 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-3xl border border-indigo-100 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white font-extrabold text-lg shadow-sm">
                {selectedDoctor?.name?.charAt(0) || 'D'}
              </div>
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Dokter Terpilih</span>
                <h3 className="font-extrabold text-base text-slate-900">{selectedDoctor?.name || selectedDoctor?.nama_lengkap}</h3>
                <p className="text-xs text-slate-600">{selectedDoctor?.polyclinic_name || selectedPoli?.nama_poli}</p>
              </div>
            </div>
            <span className="text-3xl">🩺</span>
          </div>

          {/* 1. Slot Jadwal Praktik 30 Menit */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                1. Pilih Slot Waktu Praktik (Durasi Pasti 30 Menit) *
              </label>
              <p className="text-xs text-slate-400 mt-0.5">
                Setiap konsultasi dijadwalkan tepat 30 menit agar pelayanan tertib dan tidak bentrok.
              </p>
            </div>

            {!selectedDoctor?.schedules || selectedDoctor.schedules.length === 0 ? (
              <p className="text-xs text-rose-500 italic py-3">Dokter ini belum memiliki jadwal praktik aktif.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {selectedDoctor.schedules.map((s) => {
                  const isSelected = selectedSchedule?.id === s.id;
                  const dayName = s.day || s.hari;
                  const startTime = (s.start_time || s.jam_mulai)?.substring(0, 5);
                  const endTime = (s.end_time || s.jam_selesai)?.substring(0, 5);

                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedSchedule(s);
                        // Auto clear or suggest matching date
                        setAppointmentDate('');
                      }}
                      className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600/20 shadow-sm'
                          : 'border-slate-200 hover:border-indigo-300 bg-slate-50/40 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-slate-900">{dayName}</span>
                        {isSelected ? (
                          <span className="text-[10px] text-white bg-indigo-600 px-2 py-0.5 rounded-full font-bold">
                            Terpilih
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold">30 Menit</span>
                        )}
                      </div>
                      <p className="text-sm font-mono font-bold text-indigo-600 mt-2">
                        {startTime} - {endTime}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Tanggal Booking dengan Smart Suggestions */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                2. Tanggal Kunjungan *
              </label>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedSchedule
                  ? `Slot ini dijadwalkan pada hari ${scheduleDay}. Pilih tanggal yang jatuh pada hari ${scheduleDay}.`
                  : 'Silakan pilih slot waktu di atas terlebih dahulu.'}
              </p>
            </div>

            {/* Quick date suggestion pills */}
            {suggestedDates.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-slate-500 mb-2">Pilihan tanggal terdekat:</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedDates.map((sug) => (
                    <button
                      key={sug.iso}
                      type="button"
                      onClick={() => setAppointmentDate(sug.iso)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        appointmentDate === sug.iso
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/50'
                      }`}
                    >
                      <CalendarIcon className="w-3.5 h-3.5" />
                      <span>{sug.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <input
                type="date"
                min={new Date().toISOString().substring(0, 10)}
                value={appointmentDate}
                onChange={handleDateChange}
                required
                className="w-full sm:w-64 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {appointmentDate && (
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
                  Hari: <b className="text-indigo-600">{DAY_MAP[new Date(appointmentDate.split('-').map(Number)[0], appointmentDate.split('-').map(Number)[1] - 1, appointmentDate.split('-').map(Number)[2]).getDay()]}</b>
                </span>
              )}
            </div>
          </div>

          {/* 3. Keluhan / Catatan Pasien */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-2xs space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              3. Keluhan Singkat / Alasan Konsultasi (Opsional)
            </label>
            <p className="text-xs text-slate-400">
              Membantu dokter mempersiapkan konsultasi Anda dengan lebih baik.
            </p>
            <textarea
              rows={3}
              value={keluhan}
              onChange={(e) => setKeluhan(e.target.value)}
              placeholder="Contoh: Demam sejak 2 hari yang lalu, pusing dan batuk ringan..."
              className="w-full rounded-2xl border border-slate-300 p-3.5 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 mt-2"
            />
          </div>

          {/* Summary & Submit */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Link
              href="/dashboard"
              className="px-5 py-3 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={submitting || !selectedSchedule || !appointmentDate}
              className="px-7 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              <span>{submitting ? 'Memproses Reservasi...' : 'Konfirmasi & Buat Janji'}</span>
              <span>→</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function NewAppointmentPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <NewAppointmentContent />
    </Suspense>
  );
}
