'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import LoadingSpinner from '@/components/LoadingSpinner';
import { PoliIcon } from '@/components/Icons';

export default function PublicPoliPage() {
  const [polyclinics, setPolyclinics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/polyclinics');
        const json = await res.json();
        setPolyclinics(json.polyclinics || json.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md mb-2">
            Layanan Unggulan
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Daftar Poliklinik Spesialis
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Pusat layanan poliklinik terlengkap dengan peralatan diagnostik terdepan dan dokter spesialis berpengalaman.
          </p>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : polyclinics.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 text-slate-500 shadow-2xs">
            <PoliIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-800">Belum ada data poliklinik tersedia.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {polyclinics.map((p) => (
              <div
                key={p.id}
                className="group p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-lg hover:border-indigo-300 hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
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
                  <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {p.nama_poli || p.name}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
                    {p.deskripsi || p.description || 'Layanan konsultasi dan tindakan medis spesialis.'}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <Link
                    href={`/doctors?polyclinic_id=${p.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 group-hover:translate-x-1 transition-all"
                  >
                    <span>Lihat Dokter Spesialis Poli Ini</span>
                    <span>→</span>
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
