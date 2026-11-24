'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import LoadingSpinner from '@/components/LoadingSpinner';
import { CalendarIcon, PhoneIcon, SearchIcon } from '@/components/Icons';

function DoctorsContent() {
  const searchParams = useSearchParams();
  const initialPoliId = searchParams.get('polyclinic_id') || searchParams.get('poli_id') || '';

  const [doctors, setDoctors] = useState([]);
  const [polyclinics, setPolyclinics] = useState([]);
  const [selectedPoli, setSelectedPoli] = useState(initialPoliId);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [dRes, pRes] = await Promise.all([
          fetch('/api/doctors'),
          fetch('/api/polyclinics'),
        ]);
        const dJson = await dRes.json();
        const pJson = await pRes.json();

        setDoctors(dJson.doctors || dJson.data || []);
        setPolyclinics(pJson.polyclinics || pJson.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredDoctors = selectedPoli
    ? doctors.filter((d) => String(d.poli_id) === String(selectedPoli))
    : doctors;

  return (
    <div className="min-h-screen bg-mesh-subtle flex flex-col relative selection:bg-indigo-100 selection:text-indigo-900">
      {/* Ambient halos */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-indigo-400/10 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute -bottom-32 left-1/2 h-96 w-96 rounded-full bg-teal-400/10 blur-3xl" />
      </div>
      <Navbar />
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2.5 py-1 rounded-md mb-2">
              Jadwal Konsultasi
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Dokter & Jadwal Praktik
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Daftar dokter spesialis aktif dengan sesi konsultasi terjadwal 30 menit per slot pasien.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <label htmlFor="filterPoliPage" className="text-xs font-bold text-slate-700 whitespace-nowrap">Filter Poli:</label>
            <select
              id="filterPoliPage"
              value={selectedPoli}
              onChange={(e) => setSelectedPoli(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
            >
              <option value="">Semua Poliklinik ({doctors.length})</option>
              {polyclinics.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama_poli || p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : filteredDoctors.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 text-slate-500 shadow-2xs">
            <SearchIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-800">Tidak ada dokter pada poliklinik ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
              >
                <div className="p-6">
                  <div className="flex items-start gap-4 border-b border-slate-100 pb-4 mb-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white font-black text-lg shadow-sm">
                      {doc.name?.charAt(0) || 'D'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-base text-slate-900 truncate">
                        {doc.name || doc.nama_lengkap}
                      </h3>
                      <p className="text-xs font-semibold text-indigo-600 mt-0.5">
                        {doc.polyclinic_name || doc.nama_poli || 'Dokter Spesialis'}
                      </p>
                      {doc.phone && (
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                          <PhoneIcon className="w-3.5 h-3.5" />
                          <span>{doc.phone}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                      Jadwal Praktik Mingguan (30 Menit)
                    </h4>
                    {doc.schedules && doc.schedules.length > 0 ? (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {doc.schedules.map((s, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100"
                          >
                            <span className="font-bold text-slate-700">{s.day || s.hari}</span>
                            <span className="font-mono text-indigo-600 font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200/50">
                              {(s.start_time || s.jam_mulai)?.substring(0, 5)} -{' '}
                              {(s.end_time || s.jam_selesai)?.substring(0, 5)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic py-2">Belum ada jadwal praktik yang aktif.</p>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-slate-50/70 border-t border-slate-100">
                  <Link
                    href={`/appointments/new?doctor_id=${doc.id}`}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
                  >
                    <CalendarIcon className="w-4 h-4" />
                    <span>Pilih Dokter & Buat Janji</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <footer className="bg-white border-t border-slate-200/80 py-8 text-center text-xs text-slate-400">
        <p>© 2026 RS Digital Sehat • Tugas Final Praktikum Pemrograman Web</p>
      </footer>
    </div>
  );
}

export default function PublicDoctorsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <DoctorsContent />
    </Suspense>
  );
}
