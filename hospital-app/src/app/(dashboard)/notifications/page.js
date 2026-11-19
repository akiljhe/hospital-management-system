'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import Toast from '@/components/Toast';
import {
  BellIcon,
  BellOffIcon,
  CheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  PillIcon,
  AlertCircleIcon,
} from '@/components/Icons';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    try {
      const res = await fetch('/api/notifications');
      const json = await res.json();
      setNotifications(json.notifications || json.data || []);
      setUnreadCount(json.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }

  async function markAllAsRead() {
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setToast({ message: 'Semua notifikasi ditandai sudah dibaca', type: 'success' });
        loadNotifications();
      }
    } catch {
      setToast({ message: 'Gagal memperbarui notifikasi', type: 'error' });
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md mb-2">
            Pusat Pesan
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BellIcon className="w-7 h-7 text-indigo-600" />
            <span>Notifikasi Saya</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pemberitahuan terkini terkait status persetujuan janji temu dan kesiapan resep obat di apotek.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <CheckIcon className="w-3.5 h-3.5" />
            <span>Tandai Semua Dibaca</span>
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 text-slate-500 shadow-2xs">
          <BellOffIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-800">Belum ada notifikasi untuk Anda.</p>
          <p className="text-xs text-slate-400 mt-1">Pemberitahuan penting akan otomatis muncul di sini.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-5 rounded-3xl border transition-all ${
                !n.sudah_dibaca && !n.is_read
                  ? 'bg-indigo-50/50 border-indigo-200 shadow-sm'
                  : 'bg-white border-slate-200/80 shadow-2xs'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5 p-2 rounded-xl bg-slate-50 shrink-0">
                    {n.judul?.includes('Disetujui') || n.title?.includes('Disetujui') ? (
                      <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                    ) : n.judul?.includes('Ditolak') || n.title?.includes('Ditolak') ? (
                      <XCircleIcon className="w-5 h-5 text-rose-600" />
                    ) : n.judul?.includes('Resep') || n.title?.includes('Resep') ? (
                      <PillIcon className="w-5 h-5 text-teal-600" />
                    ) : (
                      <AlertCircleIcon className="w-5 h-5 text-indigo-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">{n.judul || n.title}</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.pesan || n.message}</p>
                    <span className="text-[10px] text-slate-400 mt-2.5 inline-block font-mono">
                      {new Date(n.created_at).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {!n.sudah_dibaca && !n.is_read && (
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-600 shrink-0 mt-1 ring-4 ring-indigo-100" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
