'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import StatusBadge from '@/components/StatusBadge';
import { formatDate } from '@/lib/utils';
import {
  CalendarIcon,
  ClockIcon,
  CheckIcon,
  PillIcon,
  StethoscopeIcon,
  UsersIcon,
  MedicalRecordIcon,
  BellIcon,
} from '@/components/Icons';

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [meRes, dashRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/dashboard'),
        ]);

        const meJson = await meRes.json();
        const dashJson = await dashRes.json();

        setUser(meJson.user || meJson.data);
        setStats(dashJson);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading || !user || !stats) {
    return <LoadingSpinner />;
  }

  const role = user.role;
  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-8">
      {/* Header Greeting Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-2xl shadow-indigo-950/40 border border-indigo-500/30 ring-1 ring-white/10">
        {/* Top Border Glow Lightbeam */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_rgba(34,211,238,0.8)]" />

        {/* Ambient Vibrant Glows */}
        <div className="absolute -top-24 -right-12 w-96 h-96 bg-indigo-500/30 rounded-full blur-[90px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-12 w-80 h-80 bg-teal-500/20 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-72 h-72 bg-cyan-400/15 rounded-full blur-[100px] pointer-events-none" />

        {/* High-Tech Grid & Dot Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.22] pointer-events-none mix-blend-screen"
          style={{
            backgroundImage: `radial-gradient(circle at center, rgba(56, 189, 248, 0.7) 1.5px, transparent 1.5px), linear-gradient(to right, rgba(99, 102, 241, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(99, 102, 241, 0.2) 1px, transparent 1px)`,
            backgroundSize: `28px 28px, 28px 28px, 28px 28px`
          }}
        />

        {/* Decorative Floating Medical Cross Watermarks */}
        <div className="absolute right-36 -top-6 w-24 h-24 opacity-[0.08] pointer-events-none text-cyan-300">
          <svg viewBox="0 0 100 100" fill="currentColor">
            <path d="M38 10 H62 V38 H90 V62 H62 V90 H38 V62 H10 V38 H38 Z" />
          </svg>
        </div>
        <div className="absolute right-6 -bottom-8 w-36 h-36 opacity-[0.06] pointer-events-none text-indigo-300">
          <svg viewBox="0 0 100 100" fill="currentColor">
            <path d="M38 10 H62 V38 H90 V62 H62 V90 H38 V62 H10 V38 H38 Z" />
          </svg>
        </div>

        {/* Vivid ECG Heartbeat Waveform */}
        <div className="absolute right-0 bottom-0 h-28 w-80 sm:w-[420px] opacity-35 pointer-events-none overflow-hidden">
          <svg className="w-full h-full text-cyan-400" viewBox="0 0 420 100" fill="none" preserveAspectRatio="none">
            <defs>
              <linearGradient id="ecgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.2" />
                <stop offset="50%" stopColor="#22d3ee" stopOpacity="1" />
                <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0.4" />
              </linearGradient>
            </defs>
            <path
              d="M0 50 H160 L175 25 L190 75 L205 8 L220 92 L235 42 L245 58 L255 50 H420"
              stroke="url(#ecgGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-md mb-3 text-xs text-slate-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400"></span>
              </span>
              <span className="font-medium">{todayFormatted}</span>
              <span className="text-white/30">•</span>
              <span className="text-cyan-300 font-semibold uppercase tracking-wider text-[10px]">Sistem Online</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <span>Selamat Datang, {user.nama_lengkap || user.name}!</span>
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
              {role === 'admin' && 'Kelola seluruh operasional rumah sakit: pengguna, jadwal dokter, verifikasi janji, dan antrean farmasi.'}
              {role === 'dokter' && 'Pantau antrean janji temu approved hari ini, input rekam medis pasien, dan kelola jadwal praktik.'}
              {role === 'pasien' && 'Pantau janji temu dokter, status persiapan resep obat Anda, dan riwayat rekam medis digital.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {role === 'pasien' && (
              <Link
                href="/appointments/new"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-500 hover:from-indigo-500 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-indigo-900/50 hover:shadow-indigo-500/30 transition-all flex items-center gap-2"
              >
                <CalendarIcon className="w-4 h-4" />
                <span>Buat Janji Baru</span>
              </Link>
            )}
            {role === 'dokter' && (
              <Link
                href="/schedules"
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/15 backdrop-blur-md transition-all flex items-center gap-2"
              >
                <ClockIcon className="w-4 h-4" />
                <span>Atur Jadwal 30 Menit</span>
              </Link>
            )}
            {role === 'admin' && (
              <Link
                href="/appointments"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs shadow-lg shadow-indigo-900/50 hover:shadow-indigo-500/30 transition-all flex items-center gap-2"
              >
                <CheckIcon className="w-4 h-4" />
                <span>Verifikasi Janji</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* DASHBOARD ADMIN */}
      {role === 'admin' && (
        <div className="space-y-8">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Pending Card */}
            <div className="relative overflow-hidden bg-white p-6 rounded-3xl border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.03),0_10px_25px_-5px_rgba(15,23,42,0.04)] hover:shadow-lg transition-all">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Janji Pending</span>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100/80 text-amber-600 shadow-2xs">
                  <ClockIcon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 mt-3">
                {stats.pendingAppointments || 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">Perlu persetujuan verifikasi</p>
              <Link
                href="/appointments"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 mt-4 inline-flex items-center gap-1"
              >
                <span>Verifikasi sekarang</span>
                <span>→</span>
              </Link>
            </div>

            {/* Farmasi Queue Card */}
            <div className="relative overflow-hidden bg-white p-6 rounded-3xl border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.03),0_10px_25px_-5px_rgba(15,23,42,0.04)] hover:shadow-lg transition-all">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-500" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Antrean Farmasi</span>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-100/80 text-teal-600 shadow-2xs">
                  <PillIcon className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-3">
                <span className="text-3xl font-black text-slate-900">
                  {(stats.pharmacyQueue?.menunggu || 0) + (stats.pharmacyQueue?.siap || 0)}
                </span>
                <span className="text-xs font-medium text-slate-400">resep aktif</span>
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                <span>Diproses: <b className="text-amber-600">{stats.pharmacyQueue?.menunggu || 0}</b></span>
                <span>•</span>
                <span>Siap: <b className="text-emerald-600">{stats.pharmacyQueue?.siap || 0}</b></span>
              </div>
              <Link
                href="/pharmacy"
                className="text-xs font-bold text-teal-600 hover:text-teal-700 mt-4 inline-flex items-center gap-1"
              >
                <span>Buka antrean farmasi</span>
                <span>→</span>
              </Link>
            </div>

            {/* Dokter Hari Ini Card */}
            <div className="relative overflow-hidden bg-white p-6 rounded-3xl border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.03),0_10px_25px_-5px_rgba(15,23,42,0.04)] hover:shadow-lg transition-all">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dokter Bertugas Hari Ini</span>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-50 to-blue-100/80 text-blue-600 shadow-2xs">
                  <StethoscopeIcon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 mt-3">
                {stats.todayDoctors?.length || 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">Slot praktik aktif hari ini</p>
              <Link
                href="/doctors"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 mt-4 inline-flex items-center gap-1"
              >
                <span>Lihat jadwal dokter</span>
                <span>→</span>
              </Link>
            </div>

            {/* Total Pengguna Card */}
            <div className="relative overflow-hidden bg-white p-6 rounded-3xl border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.03),0_10px_25px_-5px_rgba(15,23,42,0.04)] hover:shadow-lg transition-all">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Pengguna</span>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-100/80 text-purple-600 shadow-2xs">
                  <UsersIcon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 mt-3">
                {(stats.userCounts?.admin || 0) + (stats.userCounts?.dokter || 0) + (stats.userCounts?.pasien || 0)}
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                <span>Dokter: <b>{stats.userCounts?.dokter || 0}</b></span>
                <span>•</span>
                <span>Pasien: <b>{stats.userCounts?.pasien || 0}</b></span>
              </div>
              <Link
                href="/users"
                className="text-xs font-bold text-purple-600 hover:text-purple-700 mt-4 inline-flex items-center gap-1"
              >
                <span>Kelola pengguna</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Dokter yang Bertugas Hari Ini */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <StethoscopeIcon className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Dokter yang Bertugas Hari Ini</h2>
                  <p className="text-xs text-slate-400">Jadwal slot aktif pada hari {todayFormatted.split(',')[0]}</p>
                </div>
              </div>
              <Link href="/doctors" className="text-xs font-semibold text-indigo-600 hover:underline">
                Lihat Semua Dokter →
              </Link>
            </div>

            {stats.todayDoctors?.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs">
                Tidak ada jadwal dokter untuk hari ini.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.todayDoctors.map((doc, idx) => (
                  <div key={idx} className="p-4 rounded-2xl border border-slate-200/70 bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{doc.name}</h4>
                      <p className="text-xs text-indigo-600 font-medium">{doc.polyclinic_name || 'Spesialis'}</p>
                    </div>
                    <span className="text-xs font-mono font-bold bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 shadow-2xs">
                      {doc.jam_mulai?.substring(0, 5)} - {doc.jam_selesai?.substring(0, 5)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DASHBOARD DOKTER */}
      {role === 'dokter' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="relative overflow-hidden bg-white p-6 rounded-3xl border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.03),0_10px_25px_-5px_rgba(15,23,42,0.04)] hover:shadow-lg transition-all">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Janji Masuk (Pending)</span>
              <div className="text-3xl font-black text-amber-600 mt-2">
                {stats.pendingAppointments || 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">Perlu dikonfirmasi dokter</p>
              <Link href="/appointments" className="text-xs font-bold text-amber-600 hover:text-amber-700 mt-4 inline-flex items-center gap-1">
                <span>Konfirmasi sekarang</span>
                <span>→</span>
              </Link>
            </div>

            <div className="relative overflow-hidden bg-white p-6 rounded-3xl border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.03),0_10px_25px_-5px_rgba(15,23,42,0.04)] hover:shadow-lg transition-all">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500" />
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Antrean Approved Hari Ini</span>
              <div className="text-3xl font-black text-emerald-600 mt-2">
                {stats.todayApprovedCount || 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">Pasien siap diperiksa & konsultasi</p>
              <Link href="/medical-records" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 mt-4 inline-flex items-center gap-1">
                <span>Input rekam medis</span>
                <span>→</span>
              </Link>
            </div>

            <div className="relative overflow-hidden bg-white p-6 rounded-3xl border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.03),0_10px_25px_-5px_rgba(15,23,42,0.04)] hover:shadow-lg transition-all">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500" />
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Jadwal Praktik Anda</span>
              <div className="text-3xl font-black text-indigo-600 mt-2">
                {stats.mySchedules?.length || 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">Slot 30 menit terdaftar</p>
              <Link href="/schedules" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 mt-4 inline-flex items-center gap-1">
                <span>Atur jadwal praktik</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Antrean Pasien Approved Hari Ini */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <MedicalRecordIcon className="w-5 h-5 text-indigo-600" /> Antrean Pasien Hari Ini (Approved)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Pasien yang telah disetujui dan menunggu pemeriksaan</p>
              </div>
              <Link href="/medical-records" className="text-xs font-semibold text-indigo-600 hover:underline">
                Rekam Medis Lengkap →
              </Link>
            </div>

            {stats.todayApproved?.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs">
                Belum ada pasien berstatus Approved untuk hari ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50/80 text-[11px] uppercase font-bold text-slate-400 border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Jam Slot</th>
                      <th className="py-3 px-4">Nama Pasien</th>
                      <th className="py-3 px-4">Telepon</th>
                      <th className="py-3 px-4">Keluhan</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats.todayApproved.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                          {app.jam_mulai?.substring(0, 5)} - {app.jam_selesai?.substring(0, 5)}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">{app.patient_name}</td>
                        <td className="py-3 px-4 text-xs">{app.patient_phone || '-'}</td>
                        <td className="py-3 px-4 max-w-xs truncate text-xs">{app.keluhan || app.keluhan_singkat || '-'}</td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/medical-records?appointment_id=${app.id}`}
                            className="inline-flex py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                          >
                            Tulis Rekam Medis
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 5 Pasien Terbaru yang Pernah Diperiksa */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <UsersIcon className="w-5 h-5 text-indigo-600" /> 5 Pasien Terbaru yang Pernah Diperiksa
            </h2>
            {stats.recentPatients?.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">Belum ada pasien yang diperiksa sebelumnya.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {stats.recentPatients.map((rec) => (
                  <div key={rec.id} className="py-3.5 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{rec.patient_name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Diagnosis: <span className="font-medium text-slate-700">{rec.diagnosis}</span>
                      </p>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(rec.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DASHBOARD PASIEN */}
      {role === 'pasien' && (
        <div className="space-y-8">
          {/* Status Janji Terakhir */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-indigo-600" /> Status Janji Temu Terakhir Anda
              </h2>
              <Link href="/appointments" className="text-xs font-semibold text-indigo-600 hover:underline">
                Riwayat Lengkap →
              </Link>
            </div>

            {stats.latestAppointment ? (
              <div className="bg-slate-50/70 rounded-2xl p-5 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <StatusBadge status={stats.latestAppointment.status} />
                    <span className="text-xs text-slate-500">
                      Tanggal Booking:{' '}
                      <b className="text-slate-800">
                        {formatDate(stats.latestAppointment.tanggal_booking)}
                      </b>
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 mt-2.5">
                    {stats.latestAppointment.doctor_name}
                  </h3>
                  <p className="text-xs text-indigo-600 font-semibold mt-0.5">
                    {stats.latestAppointment.polyclinic_name} • Jam {stats.latestAppointment.jam_mulai?.substring(0, 5)} - {stats.latestAppointment.jam_selesai?.substring(0, 5)}
                  </p>
                  {(stats.latestAppointment.keluhan || stats.latestAppointment.keluhan_singkat) && (
                    <p className="text-xs text-slate-600 mt-2 italic bg-white p-2.5 rounded-xl border border-slate-100 inline-block">
                      "{stats.latestAppointment.keluhan || stats.latestAppointment.keluhan_singkat}"
                    </p>
                  )}
                  {stats.latestAppointment.status === 'Rejected' && stats.latestAppointment.alasan_penolakan && (
                    <div className="mt-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                      <b>Alasan penolakan:</b> {stats.latestAppointment.alasan_penolakan}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href="/appointments"
                    className="py-2 px-4 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
                  >
                    Detail Janji Temu
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-sm font-semibold text-slate-700 mb-1">Anda belum memiliki janji temu dokter aktif.</p>
                <p className="text-xs text-slate-400 mb-4">Pilih dokter spesialis dan waktu kunjungan Anda sekarang.</p>
                <Link
                  href="/appointments/new"
                  className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all"
                >
                  <CalendarIcon className="w-4 h-4" />
                  <span>Buat Janji Pertama Anda</span>
                </Link>
              </div>
            )}
          </div>

          {/* Resep Siap Diambil & Notifikasi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Resep Siap Diambil */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <PillIcon className="w-5 h-5 text-emerald-600" /> Resep Obat Siap Diambil
                </h2>
                <Link href="/medical-records" className="text-xs font-semibold text-teal-600 hover:underline">
                  Semua Resep →
                </Link>
              </div>

              {stats.readyPrescriptions?.length === 0 ? (
                <div className="text-xs text-slate-400 py-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  Tidak ada resep yang sedang menunggu diambil saat ini.
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.readyPrescriptions.map((r) => (
                    <div key={r.id} className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 flex items-center justify-between">
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                          SIAP DIAMBIL DI APOTEK
                        </span>
                        <h4 className="font-bold text-sm text-slate-900 mt-1.5">Resep Dokter: {r.doctor_name}</h4>
                        <p className="text-xs text-slate-600 mt-0.5">Diagnosis: {r.diagnosis}</p>
                      </div>
                      <Link
                        href="/medical-records"
                        className="py-1.5 px-3.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
                      >
                        Lihat Obat
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notifikasi Terbaru */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BellIcon className="w-5 h-5 text-indigo-600" /> Notifikasi Terbaru
                </h2>
                <Link href="/notifications" className="text-xs font-semibold text-indigo-600 hover:underline">
                  Lihat Semua →
                </Link>
              </div>

              {stats.approvedNotifications?.length === 0 ? (
                <div className="text-xs text-slate-400 py-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  Belum ada notifikasi baru untuk Anda.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {stats.approvedNotifications.map((n) => (
                    <div key={n.id} className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50 text-xs">
                      <p className="font-bold text-slate-900">{n.judul}</p>
                      <p className="text-slate-600 mt-0.5">{n.pesan}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
