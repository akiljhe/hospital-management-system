'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { CalendarIcon, GlobeIcon, UserIcon, LogoutIcon, BellIcon } from './Icons';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const notifHandlerRef = useRef(null);

  const isDashboardRoute = [
    '/dashboard',
    '/users',
    '/polyclinics',
    '/medicines',
    '/schedules',
    '/appointments',
    '/pharmacy',
    '/medical-records',
    '/profile',
    '/notifications',
  ].some((prefix) => pathname.startsWith(prefix));

  useEffect(() => {
    fetchUser();
  }, [pathname]);

  // Selalu simpan handler terbaru di ref untuk menghindari stale closure
  useEffect(() => {
    notifHandlerRef.current = (event) => {
      const count = event?.detail?.unreadCount;
      if (typeof count === 'number') {
        setUnreadCount(Math.max(0, count));
      } else {
        fetchNotifications();
      }
    };
  });

  useEffect(() => {
    const listener = (event) => notifHandlerRef.current?.(event);
    window.addEventListener('notifications-updated', listener);
    return () => window.removeEventListener('notifications-updated', listener);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function fetchUser() {
    try {
      const res = await fetch('/api/auth/me');
      const json = await res.json();
      if (res.ok && (json.user || json.data)) {
        setUser(json.user || json.data);
        fetchNotifications();
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/notifications?unread=true');
      const json = await res.json();
      if (res.ok) {
        setUnreadCount(json.unreadCount || 0);
      }
    } catch {}
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push('/');
      router.refresh();
    } catch {}
  }

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 transition-shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 shrink-0 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white font-extrabold shadow-[0_2px_10px_-2px_rgba(79,70,229,0.4)] group-hover:scale-105 transition-transform duration-200">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-extrabold tracking-tight text-slate-900 leading-none">
                    RS Digital Sehat
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium leading-none mt-1 hidden sm:block">
                  Hospital Digitalization Platform
                </p>
              </div>
            </Link>
          </div>

          {/* Desktop Center Navigation - Only on public pages */}
          {!isDashboardRoute && (
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/"
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  pathname === '/'
                    ? 'text-indigo-600 bg-indigo-50/70'
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
                }`}
              >
                Beranda
              </Link>
              <Link
                href="/poli"
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  pathname === '/poli'
                    ? 'text-indigo-600 bg-indigo-50/70'
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
                }`}
              >
                Layanan Poli
              </Link>
              <Link
                href="/doctors"
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  pathname === '/doctors'
                    ? 'text-indigo-600 bg-indigo-50/70'
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
                }`}
              >
                Dokter & Jadwal
              </Link>
              <Link
                href="/appointments/new"
                className="px-3.5 py-2 rounded-xl text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors flex items-center gap-1.5"
              >
                <CalendarIcon className="w-4 h-4" />
                <span>Buat Janji</span>
              </Link>
            </nav>
          )}

          {/* Right Action Icons / User Info */}
          <div className="hidden md:flex items-center gap-3">
            {isDashboardRoute && (
              <Link
                href="/"
                className="text-xs font-semibold text-slate-500 hover:text-indigo-600 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <GlobeIcon className="w-4 h-4" />
                <span>Lihat Beranda</span>
              </Link>
            )}

            {user ? (
              <div className="flex items-center gap-2">
                {!isDashboardRoute && (
                  <Link
                    href="/dashboard"
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-[0_2px_8px_-2px_rgba(79,70,229,0.4)] transition-all flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    <span>Dashboard Saya</span>
                  </Link>
                )}

                {/* Notification Bell */}
                <Link
                  href="/notifications"
                  className="relative p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
                  title="Notifikasi"
                >
                  <BellIcon className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* User Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white font-bold text-xs shadow-sm">
                      {user.nama_lengkap?.charAt(0)?.toUpperCase() || user.name?.charAt(0) || 'U'}
                    </div>
                    <div className="text-left hidden lg:block">
                      <p className="text-xs font-bold text-slate-800 leading-none truncate max-w-[130px]">
                        {user.nama_lengkap || user.name}
                      </p>
                      <p className="text-[10px] text-slate-400 capitalize mt-0.5">{user.role}</p>
                    </div>
                    <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white py-2 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.1)] border border-slate-100 z-50">
                      <div className="px-4 py-2.5 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {user.nama_lengkap || user.name}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-indigo-50 text-indigo-700">
                          {user.role}
                        </span>
                      </div>
                      <Link
                        href="/profile"
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <UserIcon className="w-4 h-4 text-slate-400" />
                        <span>Profil Saya</span>
                      </Link>
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        <span>Halaman Dashboard</span>
                      </Link>
                      <div className="border-t border-slate-100 my-1" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <LogoutIcon className="w-4 h-4 text-rose-500" />
                        <span>Keluar (Logout)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-[0_2px_8px_-2px_rgba(79,70,229,0.4)] transition-all"
                >
                  Daftar Pasien
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center gap-2 md:hidden">
            {user && (
              <Link href="/notifications" className="relative p-2 text-slate-600">
                <BellIcon className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500" />
                )}
              </Link>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
              aria-label={mobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 py-3 space-y-1">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Beranda
            </Link>
            <Link
              href="/poli"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Layanan Poli
            </Link>
            <Link
              href="/doctors"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Dokter & Jadwal
            </Link>
            <Link
              href="/appointments/new"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-emerald-600 hover:bg-emerald-50"
            >
              <CalendarIcon className="w-4 h-4" />
              <span>Buat Janji Temu</span>
            </Link>

            {user ? (
              <>
                <div className="my-2 border-t border-slate-100 pt-2">
                  <div className="px-3 py-2 bg-slate-50 rounded-xl mb-2">
                    <p className="text-xs font-bold text-slate-900">{user.nama_lengkap || user.name}</p>
                    <p className="text-[10px] text-slate-500 capitalize">{user.role}</p>
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-indigo-600 hover:bg-indigo-50"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    <span>Buka Dashboard</span>
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <UserIcon className="w-4 h-4" />
                    <span>Profil Saya</span>
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50"
                  >
                    <LogoutIcon className="w-4 h-4" />
                    <span>Keluar (Logout)</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="my-2 border-t border-slate-100 pt-2 space-y-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center py-2 text-xs font-semibold text-slate-700 border border-slate-200 rounded-xl"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl"
                >
                  Daftar Pasien Baru
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
