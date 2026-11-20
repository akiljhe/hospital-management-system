'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import StatusBadge from '@/components/StatusBadge';
import Toast from '@/components/Toast';
import { FlaskIcon, PhoneIcon, CheckIcon, PackageIcon } from '@/components/Icons';

export default function PharmacyPage() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Semua');
  const [processingId, setProcessingId] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadPrescriptions();
  }, []);

  async function loadPrescriptions() {
    try {
      const res = await fetch('/api/prescriptions');
      const json = await res.json();
      setPrescriptions(json.prescriptions || json.data || []);
    } catch (err) {
      console.error('Failed to load prescriptions:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(prescriptionId, nextStatus) {
    const confirmationText =
      nextStatus === 'Siap Diambil'
        ? 'Tandai resep ini SIAP DIAMBIL? Sistem otomatis memotong stok obat di gudang via database trigger.'
        : 'Konfirmasi penyerahan obat: Tandai resep SUDAH DIAMBIL oleh pasien?';

    if (!confirm(confirmationText)) return;

    setProcessingId(prescriptionId);
    try {
      const res = await fetch(`/api/prescriptions/${prescriptionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || 'Gagal memperbarui status resep', type: 'error' });
        return;
      }

      setToast({
        message: `Status resep berhasil diubah menjadi "${nextStatus}"! ${nextStatus === 'Siap Diambil' ? 'Stok obat otomatis terpotong.' : ''}`,
        type: 'success',
      });
      loadPrescriptions();
    } catch {
      setToast({ message: 'Terjadi kesalahan server', type: 'error' });
    } finally {
      setProcessingId(null);
    }
  }

  if (loading) return <LoadingSpinner />;

  const tabs = ['Semua', 'Menunggu Diproses', 'Siap Diambil', 'Sudah Diambil'];

  const filteredPrescriptions = prescriptions.filter((p) => {
    if (activeTab === 'Semua') return true;
    return p.status === activeTab;
  });

  return (
    <div className="space-y-6 pb-12">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2.5 py-1 rounded-md mb-2">
            Dispensasi & Apotek
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Manajemen Farmasi & Resep Obat
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Alur peracikan obat terintegrasi: <span className="font-semibold text-slate-700">Menunggu Diproses</span> → <span className="font-semibold text-slate-700">Siap Diambil</span> (stok terpotong otomatis) → <span className="font-semibold text-slate-700">Sudah Diambil</span>.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200/80 pb-3">
        {tabs.map((tab) => {
          const count =
            tab === 'Semua'
              ? prescriptions.length
              : prescriptions.filter((p) => p.status === tab).length;

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

      {/* List Resep */}
      {filteredPrescriptions.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 text-slate-500 shadow-2xs">
          <FlaskIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-800">Tidak ada resep obat pada status "{activeTab}".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredPrescriptions.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-3.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200/50 px-2 py-0.5 rounded-md font-mono">
                      RESEP-{p.id}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      RM-{p.rekam_medis_id}
                    </span>
                  </div>
                  <StatusBadge status={p.status} />
                </div>

                <div className="space-y-1 mb-4">
                  <h3 className="font-extrabold text-base text-slate-900">Pasien: {p.patient_name}</h3>
                  <p className="text-xs text-slate-500">
                    Dokter: <span className="font-bold text-slate-700">{p.doctor_name}</span> ({p.polyclinic_name || 'Umum'})
                  </p>
                  <p className="text-xs text-slate-500">
                    Diagnosis: <span className="font-semibold text-slate-800">{p.diagnosis}</span>
                  </p>
                  {p.patient_phone && (
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                      <PhoneIcon className="w-3.5 h-3.5" />
                      <span>{p.patient_phone}</span>
                    </p>
                  )}
                </div>

                {/* Daftar Obat yang diresepkan */}
                <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-100 mb-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                    Daftar Obat Farmasi:
                  </p>
                  {p.items && p.items.length > 0 ? (
                    <ul className="space-y-1.5 text-xs">
                      {p.items.map((item, idx) => (
                        <li key={idx} className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-slate-100">
                          <span className="font-bold text-slate-800">
                            {item.nama_obat}{' '}
                            <span className="text-[10px] font-normal text-slate-400">({item.tipe})</span>
                          </span>
                          <span className="font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold text-[11px]">
                            {item.jumlah} pcs
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Tidak ada rincian item obat.</p>
                  )}
                </div>

                {/* Riwayat Waktu Pelayanan */}
                <div className="text-[11px] text-slate-400 space-y-1 font-mono">
                  <p>Dibuat: {new Date(p.created_at).toLocaleString('id-ID')}</p>
                  {p.tanggal_siap && (
                    <p className="text-emerald-600 font-semibold">Siap: {new Date(p.tanggal_siap).toLocaleString('id-ID')}</p>
                  )}
                  {p.tanggal_diambil && (
                    <p className="text-blue-600 font-semibold">Diambil: {new Date(p.tanggal_diambil).toLocaleString('id-ID')}</p>
                  )}
                </div>
              </div>

              {/* Tombol Perubahan Status (Admin) */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                {p.status === 'Menunggu Diproses' && (
                  <button
                    onClick={() => handleStatusChange(p.id, 'Siap Diambil')}
                    disabled={processingId === p.id}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckIcon className="w-4 h-4" />
                    <span>{processingId === p.id ? 'Memproses...' : 'Tandai Siap Diambil'}</span>
                  </button>
                )}

                {p.status === 'Siap Diambil' && (
                  <button
                    onClick={() => handleStatusChange(p.id, 'Sudah Diambil')}
                    disabled={processingId === p.id}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    <PackageIcon className="w-4 h-4" />
                    <span>{processingId === p.id ? 'Memproses...' : 'Serahkan ke Pasien'}</span>
                  </button>
                )}

                {p.status === 'Sudah Diambil' && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-3 py-1 rounded-xl">
                    <CheckIcon className="w-4 h-4" /> Selesai Diserahkan
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
