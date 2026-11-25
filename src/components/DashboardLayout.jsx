'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Globe, LogOut } from 'lucide-react';
import Sidebar from './Sidebar';

const ROLE_RESTRICTED_ROUTES = [
  { prefix: '/users', roles: ['admin'] },
  { prefix: '/polyclinics', roles: ['admin'] },
  { prefix: '/medicines', roles: ['admin'] },
  { prefix: '/pharmacy', roles: ['admin', 'pasien'] },
  { prefix: '/schedules', roles: ['dokter', 'admin'] },
  { prefix: '/appointments/new', roles: ['pasien'] },
];

export default function DashboardLayout({ children, initialUser = null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(initialUser);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?unread=true');
      const json = await res.json();
      if (res.ok) setUnreadCount(json.unreadCount || 0);
    } catch {}
  }, []);

  // Simpan handler terbaru di ref agar listener global tidak terkena stale closure
  const notifHandlerRef = useRef(null);
  useEffect(() => {
    notifHandlerRef.current = (event) => {
      const count = event?.detail?.unreadCount;
      if (typeof count === 'number') {
        setUnreadCount(Math.max(0, count));
      } else {
        fetchUnreadCount();
      }
    };
  });

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me');
        const json = await res.json();
        if (res.ok && (json.user || json.data)) {
          setUser(json.user || json.data);
        }
      } catch {}
    }
    fetchUser();
  }, []);

  useEffect(() => {
    if (!user?.role) return;
    const rule = ROLE_RESTRICTED_ROUTES.find((r) => pathname.startsWith(r.prefix));
    if (rule && !rule.roles.includes(user.role)) {
      router.replace('/forbidden');
    }
  }, [pathname, user, router]);

  useEffect(() => {
    fetchUnreadCount();
  }, [pathname, fetchUnreadCount]);

  useEffect(() => {
    const listener = (event) => notifHandlerRef.current?.(event);
    window.addEventListener('notifications-updated', listener);
    return () => window.removeEventListener('notifications-updated', listener);
  }, []);

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    router.push('/login');
    router.refresh();
  }

  const displayName = user?.nama_lengkap || user?.name || 'User';

  return (
    <div className="min-h-screen bg-mesh-subtle flex relative">
      {/* Ambient halos */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-indigo-400/10 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute -bottom-32 left-1/2 h-96 w-96 rounded-full bg-teal-400/10 blur-3xl" />
      </div>

      <Sidebar user={user} />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-500 ring-4 ring-indigo-500/15" />
            <p className="truncate text-sm font-semibold text-slate-700">
              RS Digital Sehat <span className="text-slate-300">•</span>{' '}
              <span className="font-medium text-slate-500">Sistem Layanan Terpadu</span>
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link
              href="/"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
            >
              <Globe className="h-4 w-4" />
              <span>Website Publik</span>
            </Link>

            <Link
              href="/notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
              title="Notifikasi"
              aria-label={`Notifikasi${unreadCount > 0 ? ` (${unreadCount} belum dibaca)` : ''}`}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            <div className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />

            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-xl px-1.5 py-1 hover:bg-slate-100 transition-colors"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-700 text-xs font-bold text-white shadow-sm">
                {displayName.charAt(0).toUpperCase()}
              </span>
              <span className="hidden text-left lg:block">
                <span className="block max-w-[140px] truncate text-xs font-bold leading-none text-slate-800">
                  {displayName}
                </span>
                <span className="mt-1 block text-[10px] capitalize leading-none text-slate-400">
                  {user?.role || 'Pengguna'}
                </span>
              </span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
              title="Keluar"
              aria-label="Keluar"
            >
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        </header>

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
