'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  CalendarIcon,
  StethoscopeIcon,
  PillIcon,
  MedicalRecordIcon,
  SearchIcon,
  PhoneIcon,
  PoliIcon,
  CheckCircleIcon,
  UserIcon,
} from '@/components/Icons';

export default function HomePage() {
  const [polyclinics, setPolyclinics] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPoli, setSelectedPoli] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [poliRes, docRes] = await Promise.all([
          fetch('/api/polyclinics'),
          fetch('/api/doctors'),
        ]);

        const poliJson = await poliRes.json();
        const docJson = await docRes.json();

        setPolyclinics(poliJson.polyclinics || poliJson.data || []);
        setDoctors(docJson.doctors || docJson.data || []);
      } catch (err) {
        console.error('Failed to load home data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
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

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-[#0a0f2e] to-[#051329] text-white py-16 sm:py-24 border-b border-indigo-950/60">
        {/* Top Border Glow Lightbeam */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_rgba(34,211,238,0.7)]" />

        {/* Ambient Vibrant Glow Orbs */}
        <div className="absolute top-0 right-1/4 -translate-y-1/3 w-[600px] h-[600px] bg-indigo-600/30 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-10 translate-y-1/3 w-[550px] h-[550px] bg-teal-500/25 rounded-full blur-[110px] pointer-events-none" />
        <div className="absolute top-1/2 right-10 -translate-y-1/2 w-96 h-96 bg-cyan-400/20 rounded-full blur-[90px] pointer-events-none" />

        {/* Medical Technology Grid Pattern Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.22] pointer-events-none mix-blend-screen"
          style={{
            backgroundImage: `radial-gradient(circle at center, rgba(56, 189, 248, 0.7) 1.5px, transparent 1.5px), linear-gradient(to right, rgba(99, 102, 241, 0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(99, 102, 241, 0.22) 1px, transparent 1px)`,
            backgroundSize: `36px 36px, 36px 36px, 36px 36px`
          }}
        />

        {/* Decorative Floating Medical Cross Watermarks */}
        <div className="absolute left-8 top-12 w-28 h-28 opacity-[0.06] pointer-events-none text-cyan-300">
          <svg viewBox="0 0 100 100" fill="currentColor">
            <path d="M38 10 H62 V38 H90 V62 H62 V90 H38 V62 H10 V38 H38 Z" />
          </svg>
        </div>
        <div className="absolute right-1/3 bottom-8 w-44 h-44 opacity-[0.05] pointer-events-none text-indigo-300">
          <svg viewBox="0 0 100 100" fill="currentColor">
            <path d="M38 10 H62 V38 H90 V62 H62 V90 H38 V62 H10 V38 H38 Z" />
          </svg>
        </div>

        {/* Futuristic Concentric Radial Rings (Medical Radar / Scan Graphic) */}
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] opacity-[0.14] pointer-events-none">
          <svg className="w-full h-full text-indigo-300" viewBox="0 0 600 600" fill="none">
            <circle cx="300" cy="300" r="100" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 6" />
            <circle cx="300" cy="300" r="180" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="300" cy="300" r="260" stroke="currentColor" strokeWidth="1.5" strokeDasharray="8 8" />
          </svg>
        </div>

        {/* Dynamic ECG Heartbeat Waveform in Hero Background */}
        <div className="absolute bottom-2 inset-x-0 h-32 opacity-25 pointer-events-none overflow-hidden">
          <svg className="w-full h-full text-teal-400" viewBox="0 0 1200 100" fill="none" preserveAspectRatio="none">
            <defs>
              <linearGradient id="heroEcgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.1" />
                <stop offset="30%" stopColor="#22d3ee" stopOpacity="0.8" />
                <stop offset="70%" stopColor="#2dd4bf" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <path
              d="M0 50 H300 L320 25 L340 75 L360 5 L380 95 L400 40 L415 55 L430 50 H750 L770 20 L790 80 L810 0 L830 100 L850 45 L865 60 L880 50 H1200"
              stroke="url(#heroEcgGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="max-w-2xl text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-400/30 backdrop-blur-md mb-6 text-xs text-indigo-200 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                </span>
                <span className="font-semibold text-cyan-200">Digital Hospital 4.0</span>
                <span className="text-white/30">•</span>
                <span>Layanan Rawat Jalan & Farmasi Terintegrasi</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] text-white">
                Layanan Kesehatan Terpadu,{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-indigo-200 to-sky-300">
                  Cepat & Terpercaya
                </span>
              </h1>

              <p className="mt-5 text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
                Jadwalkan konsultasi dokter spesialis dalam slot 30 menit tanpa antre panjang. Akses rekam medis permanen dan status resep farmasi secara langsung dari mana saja.
              </p>

              <div className="mt-8 flex flex-wrap gap-3.5 justify-center lg:justify-start">
                <Link
                  href="/appointments/new"
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-teal-500 hover:from-indigo-500 hover:to-teal-400 text-white font-bold text-sm shadow-[0_4px_25px_-4px_rgba(99,102,241,0.6)] transition-all flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                >
                  <CalendarIcon className="w-4 h-4" />
                  <span>Buat Janji Sekarang</span>
                </Link>

                <Link
                  href="/login"
                  className="px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm border border-white/20 backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer hover:border-cyan-400/40"
                >
                  <span>Masuk / Tamu</span>
                  <span className="text-cyan-300">→</span>
                </Link>
              </div>

              {/* Service micro guarantees */}
              <div className="mt-10 pt-6 border-t border-white/10 grid grid-cols-3 gap-4 text-left">
                <div>
                  <p className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-400 shrink-0" /> Slot Pasti
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">30 menit per janji</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <CheckCircleIcon className="w-4 h-4 text-teal-400 shrink-0" /> Anti-Bentrok
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Cek ganda otomatis</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <CheckCircleIcon className="w-4 h-4 text-sky-400 shrink-0" /> Farmasi Siaga
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Pelacakan obat terpadu</p>
                </div>
              </div>
            </div>

            {/* Hero Interactive Stat Highlight */}
            <div className="w-full lg:w-auto shrink-0 grid grid-cols-2 gap-4 max-w-md">
              <div className="group bg-slate-900/60 backdrop-blur-xl border border-white/15 p-6 rounded-3xl text-center hover:border-cyan-400/50 hover:bg-slate-900/80 hover:shadow-[0_10px_30px_-10px_rgba(34,211,238,0.3)] transition-all">
                <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-indigo-300 group-hover:scale-105 transition-transform inline-block">
                  {polyclinics.length || '3'}
                </div>
                <div className="text-xs font-semibold text-slate-200 mt-2">Poli Spesialis</div>
                <p className="text-[11px] text-slate-400 mt-1">Layanan lengkap</p>
              </div>

              <div className="group bg-slate-900/60 backdrop-blur-xl border border-white/15 p-6 rounded-3xl text-center hover:border-indigo-400/50 hover:bg-slate-900/80 hover:shadow-[0_10px_30px_-10px_rgba(99,102,241,0.3)] transition-all">
                <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-sky-300 group-hover:scale-105 transition-transform inline-block">
                  {doctors.length || '2'}
                </div>
                <div className="text-xs font-semibold text-slate-200 mt-2">Dokter Spesialis</div>
                <p className="text-[11px] text-slate-400 mt-1">Berpengalaman</p>
              </div>

              <div className="group bg-slate-900/60 backdrop-blur-xl border border-white/15 p-6 rounded-3xl text-center hover:border-teal-400/50 hover:bg-slate-900/80 hover:shadow-[0_10px_30px_-10px_rgba(45,212,191,0.3)] transition-all">
                <div className="text-3xl font-black text-white group-hover:scale-105 transition-transform inline-block">30 Min</div>
                <div className="text-xs font-semibold text-slate-200 mt-2">Durasi Slot</div>
                <p className="text-[11px] text-slate-400 mt-1">Tepat & tertib</p>
              </div>

              <div className="group bg-slate-900/60 backdrop-blur-xl border border-white/15 p-6 rounded-3xl text-center hover:border-emerald-400/50 hover:bg-slate-900/80 hover:shadow-[0_10px_30px_-10px_rgba(52,211,153,0.3)] transition-all">
                <div className="text-3xl font-black text-emerald-400 group-hover:scale-105 transition-transform inline-block">100%</div>
                <div className="text-xs font-semibold text-slate-200 mt-2">Digital Paperless</div>
                <p className="text-[11px] text-slate-400 mt-1">Data aman terintegrasi</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20 flex-1 w-full">
        {/* Polyclinics Section */}
        <section id="poli">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md mb-2">
                Fasilitas Unggulan
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Daftar Poliklinik Rumah Sakit
              </h2>
              <p className="mt-1 text-slate-500 text-sm max-w-xl">
                Pilih poli spesialis di bawah untuk melihat dokter yang bertugas dan jadwal praktiknya.
              </p>
            </div>

            {selectedPoli && (
              <button
                onClick={() => setSelectedPoli('')}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors self-start cursor-pointer"
              >
                Bersihkan Filter Poli
              </button>
            )}
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {polyclinics.map((p) => {
                const isSelected = String(selectedPoli) === String(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPoli(isSelected ? '' : String(p.id))}
                    className={`group relative p-6 rounded-3xl transition-all duration-200 hover:-translate-y-1 cursor-pointer ${
                      isSelected
                        ? 'bg-white ring-2 ring-indigo-600 shadow-lg shadow-indigo-600/10'
                        : 'bg-white hover:bg-white/80 border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                        <PoliIcon name={p.nama_poli || p.name} className="w-6 h-6" />
                      </div>
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isSelected ? 'Terpilih' : 'Poli Medis'}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {p.nama_poli || p.name}
                    </h3>

                    <p className="mt-2 text-sm text-slate-500 line-clamp-2 leading-relaxed">
                      {p.deskripsi || p.description || 'Pemeriksaan dan tindakan medis spesialis terpercaya.'}
                    </p>

                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
                      <span>{isSelected ? 'Menampilkan dokter poli ini' : 'Lihat jadwal dokter'}</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Doctors & Schedules Section */}
        <section id="dokter" className="scroll-mt-20">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2.5 py-1 rounded-md mb-2">
                Tenaga Medis Profesional
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Daftar Dokter & Jadwal Praktik
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                Jadwal konsultasi tertib 30 menit per slot. Pilih jadwal yang cocok untuk kebutuhan Anda.
              </p>
            </div>

            {/* Filter by Poli Select */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <label htmlFor="filterPoli" className="text-xs font-bold text-slate-700 whitespace-nowrap">
                Filter Poli:
              </label>
              <select
                id="filterPoli"
                value={selectedPoli}
                onChange={(e) => setSelectedPoli(e.target.value)}
                className="w-full sm:w-52 text-xs font-semibold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
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
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 text-slate-500 shadow-sm">
              <SearchIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-800">Tidak ada dokter yang terdaftar pada kategori ini.</p>
              <p className="text-xs text-slate-400 mt-1">Coba pilih kategori poliklinik lain.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDoctors.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-lg hover:border-slate-300 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white font-extrabold text-lg shadow-sm">
                        {doc.name?.charAt(0) || 'D'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-900 text-base leading-snug truncate">
                          {doc.name || doc.nama_lengkap}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/40">
                            {doc.polyclinic_name || doc.nama_poli || 'Dokter Spesialis'}
                          </span>
                        </div>
                        {doc.phone && (
                          <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5">
                            <PhoneIcon className="w-3.5 h-3.5 text-slate-400" />
                            <span>{doc.phone}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Weekly Schedules */}
                    <div className="mt-5 pt-4 border-t border-slate-100">
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                        <span>Jadwal Praktik (30 Menit)</span>
                        <span className="font-normal lowercase">hari & jam</span>
                      </h4>

                      {doc.schedules && doc.schedules.length > 0 ? (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {doc.schedules.map((s, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100"
                            >
                              <span className="font-bold text-slate-700">{s.day || s.hari}</span>
                              <span className="text-indigo-600 font-mono font-semibold bg-white px-2 py-0.5 rounded-md border border-slate-200/50">
                                {(s.start_time || s.jam_mulai)?.substring(0, 5)} - {(s.end_time || s.jam_selesai)?.substring(0, 5)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic py-2">Belum ada jadwal yang diatur oleh dokter.</p>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="p-4 bg-slate-50/70 border-t border-slate-100">
                    <Link
                      href={`/appointments/new?doctor_id=${doc.id}`}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all hover:shadow active:scale-[0.99] cursor-pointer"
                    >
                      <CalendarIcon className="w-4 h-4" />
                      <span>Pilih Dokter & Buat Janji</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Alur Pelayanan Rumah Sakit (Steps) */}
        <section className="bg-gradient-to-br from-indigo-50/50 via-white to-teal-50/30 rounded-3xl border border-indigo-100/60 p-8 sm:p-12">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider bg-indigo-100/60 px-3 py-1 rounded-full">
              Alur Pelayanan Digital
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-3">
              4 Langkah Mudah Berobat di RS Digital Sehat
            </h2>
            <p className="text-slate-500 text-sm mt-2">
              Proses digital yang transparan dan terstruktur dari awal pendaftaran hingga pengambilan resep obat.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative">
              <span className="text-3xl font-black text-indigo-100 absolute top-4 right-4">01</span>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 mb-3">
                <UserIcon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Daftar Akun & Pilih Poli</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Pasien mendaftarkan akun secara mandiri dan memilih spesialis poliklinik yang dibutuhkan.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative">
              <span className="text-3xl font-black text-indigo-100 absolute top-4 right-4">02</span>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600 mb-3">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Pilih Jadwal 30 Menit</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Pilih dokter dan slot waktu praktik yang tersedia tanpa takut bentrok jadwal.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative">
              <span className="text-3xl font-black text-indigo-100 absolute top-4 right-4">03</span>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600 mb-3">
                <StethoscopeIcon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Konsultasi & Rekam Medis</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Dokter mencatat diagnosis dan resep obat dalam satu transaksi digital terintegrasi.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative">
              <span className="text-3xl font-black text-indigo-100 absolute top-4 right-4">04</span>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 mb-3">
                <PillIcon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Ambil Obat di Farmasi</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Pantau status resep hingga siap diambil di apotek rumah sakit tanpa perlu antre tiket.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 mt-16 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">RS Digital Sehat</span>
            <span>•</span>
            <span>Tugas Final Praktikum Pemrograman Web 2026</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-indigo-600 transition-colors">Portal Staf / Admin</Link>
            <Link href="/poli" className="hover:text-indigo-600 transition-colors">Poliklinik</Link>
            <Link href="/doctors" className="hover:text-indigo-600 transition-colors">Dokter</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
