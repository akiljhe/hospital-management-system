'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { PencilIcon, MedicalRecordIcon, PillIcon, AlertCircleIcon, XIcon, PlusIcon } from '@/components/Icons';

function MedicalRecordsContent() {
  const searchParams = useSearchParams();
  const appointmentIdParam = searchParams.get('appointment_id');

  const [records, setRecords] = useState([]);
  const [approvedAppointments, setApprovedAppointments] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Form modal catat rekam medis
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [tindakan, setTindakan] = useState('');
  const [catatan, setCatatan] = useState('');
  const [prescriptionItems, setPrescriptionItems] = useState([
    { obat_id: '', jumlah: 1 },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [meRes, recRes, medRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/medical-records'),
        fetch('/api/medicines'),
      ]);

      const meJson = await meRes.json();
      const recJson = await recRes.json();
      const medJson = await medRes.json();

      const currentUser = meJson.user || meJson.data;
      setUser(currentUser);
      setRecords(recJson.records || recJson.data || []);
      setMedicines(medJson.medicines || medJson.data || []);

      if (currentUser?.role === 'dokter') {
        const appRes = await fetch('/api/appointments?status=Approved');
        const appJson = await appRes.json();
        const approved = appJson.appointments || appJson.data || [];
        setApprovedAppointments(approved);

        if (appointmentIdParam) {
          const match = approved.find((a) => String(a.id) === String(appointmentIdParam));
          if (match) {
            setSelectedAppointmentId(match.id);
            setModalOpen(true);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load medical records data:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleAddMedicineRow() {
    setPrescriptionItems([...prescriptionItems, { obat_id: '', jumlah: 1 }]);
  }

  function handleRemoveMedicineRow(index) {
    if (prescriptionItems.length === 1) return;
    setPrescriptionItems(prescriptionItems.filter((_, i) => i !== index));
  }

  function handleMedicineChange(index, field, value) {
    const updated = [...prescriptionItems];
    updated[index][field] = value;
    setPrescriptionItems(updated);
  }

  async function handleSubmitRecord(e) {
    e.preventDefault();

    if (!selectedAppointmentId) {
      setToast({ message: 'Pilih janji temu pasien terlebih dahulu', type: 'error' });
      return;
    }
    if (!diagnosis.trim()) {
      setToast({ message: 'Diagnosis klinis wajib diisi', type: 'error' });
      return;
    }

    const validItems = prescriptionItems
      .filter((item) => item.obat_id && parseInt(item.jumlah, 10) > 0)
      .map((item) => ({
        obat_id: parseInt(item.obat_id, 10),
        jumlah: parseInt(item.jumlah, 10),
      }));

    setSaving(true);
    try {
      const res = await fetch('/api/medical-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          janji_temu_id: parseInt(selectedAppointmentId, 10),
          diagnosis: diagnosis.trim(),
          tindakan: tindakan.trim(),
          catatan: catatan.trim(),
          prescription_items: validItems,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error || 'Gagal menyimpan rekam medis', type: 'error' });
        return;
      }

      setToast({
        message: 'Rekam medis dan resep obat berhasil disimpan secara permanen!',
        type: 'success',
      });
      setModalOpen(false);
      setDiagnosis('');
      setTindakan('');
      setCatatan('');
      setPrescriptionItems([{ obat_id: '', jumlah: 1 }]);
      setSelectedAppointmentId('');
      loadData();
    } catch {
      setToast({ message: 'Terjadi kesalahan server', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 pb-12">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2.5 py-1 rounded-md mb-2">
            Integritas Data Klinis
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {user?.role === 'pasien' ? 'Riwayat Rekam Medis & Resep' : 'Rekam Medis Pasien'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Arsip riwayat diagnosis dan pengobatan. Catatan medis bersifat permanen untuk menjamin keaslian bukti klinis.
          </p>
        </div>

        {user?.role === 'dokter' && (
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all self-start sm:self-auto cursor-pointer"
          >
            <PencilIcon className="w-4 h-4" />
            <span>Catat Rekam Medis & Resep</span>
          </button>
        )}
      </div>

      {/* Daftar Rekam Medis */}
      {records.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 text-slate-500 shadow-2xs">
          <MedicalRecordIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-800">Belum ada arsip rekam medis yang tercatat.</p>
          <p className="text-xs text-slate-400 mt-1">
            {user?.role === 'dokter'
              ? 'Pilih janji pasien Approved untuk mulai menulis rekam medis.'
              : 'Rekam medis akan muncul setelah konsultasi selesai dilakukan.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((rec) => (
            <div
              key={rec.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-md transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/50 px-2 py-0.5 rounded-md">
                      RM-{rec.id}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(rec.appointment_date || rec.created_at).toLocaleDateString('id-ID', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1.5">
                    {user?.role === 'pasien' ? `Dokter Pemeriksa: ${rec.doctor_name}` : `Pasien: ${rec.patient_name}`}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Poliklinik: <b className="text-indigo-600">{rec.polyclinic_name || 'Umum'}</b>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                    Waktu: {new Date(rec.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Detail Medis 3 Kolom */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
                <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
                  <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">Diagnosis Klinis</p>
                  <p className="text-slate-900 font-extrabold text-sm leading-snug">{rec.diagnosis}</p>
                </div>

                <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
                  <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">Tindakan Medis</p>
                  <p className="text-slate-700 font-medium leading-relaxed">{rec.tindakan || '-'}</p>
                </div>

                <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
                  <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">Catatan / Edukasi</p>
                  <p className="text-slate-700 font-medium leading-relaxed">{rec.catatan || '-'}</p>
                </div>
              </div>

              {/* Bagian Resep Obat */}
              <div className="mt-5 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <PillIcon className="w-4 h-4 text-emerald-600" /> Resep Obat Farmasi
                  </span>
                  {rec.prescription_status && <StatusBadge status={rec.prescription_status} />}
                </div>

                {rec.prescription_items && rec.prescription_items.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-2.5">
                    {rec.prescription_items.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-2 bg-indigo-50/70 border border-indigo-100/80 text-indigo-900 text-xs px-3 py-1.5 rounded-xl shadow-2xs"
                      >
                        <span className="font-bold">{item.nama_obat}</span>
                        <span className="text-[11px] text-indigo-700 bg-white px-2 py-0.5 rounded-md font-mono font-bold border border-indigo-100">
                          {item.jumlah} pcs • {item.tipe === 'keras' ? 'Keras' : 'Biasa'}
                        </span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic mt-1">Tidak ada resep obat pada konsultasi ini.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tulis Rekam Medis (Dokter) */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Catat Rekam Medis & Resep Konsultasi"
      >
        <form onSubmit={handleSubmitRecord} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          {/* Pilih Janji Temu Approved */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Pilih Pasien (Status Approved) *
            </label>
            <select
              value={selectedAppointmentId}
              onChange={(e) => setSelectedAppointmentId(e.target.value)}
              required
              className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Pilih Pasien Approved --</option>
              {approvedAppointments.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.patient_name} - {new Date(app.tanggal_booking).toLocaleDateString('id-ID')} (
                  {app.jam_mulai?.substring(0, 5)}) - Keluhan: {app.keluhan || app.keluhan_singkat || 'Umum'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Diagnosis Medis *
            </label>
            <input
              type="text"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="cth. Faringitis Akut / Hipertensi Primer..."
              required
              className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Tindakan / Pemeriksaan
            </label>
            <textarea
              rows={2}
              value={tindakan}
              onChange={(e) => setTindakan(e.target.value)}
              placeholder="cth. Pemeriksaan fisik tenggorokan, tensi darah 120/80..."
              className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Catatan & Anjuran Pasien
            </label>
            <textarea
              rows={2}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="cth. Istirahat cukup, hindari makanan pedas dan berminyak..."
              className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Input Item Resep Obat */}
          <div className="border-t border-slate-200 pt-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Resep Obat Farmasi (Opsional)
              </label>
              <button
                type="button"
                onClick={handleAddMedicineRow}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                + Tambah Obat
              </button>
            </div>

            <div className="space-y-2">
              {prescriptionItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <select
                    value={item.obat_id}
                    onChange={(e) => handleMedicineChange(index, 'obat_id', e.target.value)}
                    className="flex-1 text-xs bg-white border border-slate-300 rounded-xl px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Pilih Obat --</option>
                    {medicines.map((m) => (
                      <option key={m.id} value={m.id} disabled={m.stok <= 0}>
                        {m.nama_obat || m.name} (Stok: {m.stok}) {m.stok <= 0 ? '- [HABIS]' : ''}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    value={item.jumlah}
                    onChange={(e) => handleMedicineChange(index, 'jumlah', e.target.value)}
                    placeholder="Qty"
                    className="w-20 text-xs text-center border border-slate-300 rounded-xl px-2 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  />

                  {prescriptionItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMedicineRow(index)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-xs cursor-pointer flex items-center justify-center"
                    >
                      <XIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
            <AlertCircleIcon className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <span><b>Penting:</b> Sesuai aturan rekam medis, data yang disimpan bersifat permanen dan tidak dapat diubah atau dihapus.</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Menyimpan...' : 'Simpan Rekam Medis'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function MedicalRecordsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <MedicalRecordsContent />
    </Suspense>
  );
}
