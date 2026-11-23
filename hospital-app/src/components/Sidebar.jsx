'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Building2,
  Pill,
  ClipboardCheck,
  ClipboardList,
  BookOpen,
  CalendarClock,
  UsersRound,
  FileText,
  UserRound,
  CalendarPlus,
  CalendarDays,
  LogOut,
  Plus,
} from 'lucide-react';
import { Sidebar as SidebarRoot, SidebarBody, SidebarLink, SidebarLabel } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const ICON_CLASS = 'h-[18px] w-[18px]';

const menuItems = {
  admin: [
    { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className={ICON_CLASS} /> },
    { href: '/users', label: 'Manajemen User', icon: <Users className={ICON_CLASS} /> },
    { href: '/polyclinics', label: 'Data Poliklinik', icon: <Building2 className={ICON_CLASS} /> },
    { href: '/medicines', label: 'Gudang Obat', icon: <Pill className={ICON_CLASS} /> },
    { href: '/appointments', label: 'Verifikasi Janji', icon: <ClipboardCheck className={ICON_CLASS} /> },
    { href: '/pharmacy', label: 'Farmasi & Resep', icon: <ClipboardList className={ICON_CLASS} /> },
    { href: '/medical-records', label: 'Rekam Medis', icon: <BookOpen className={ICON_CLASS} /> },
  ],
  dokter: [
    { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className={ICON_CLASS} /> },
    { href: '/schedules', label: 'Jadwal Praktik', icon: <CalendarClock className={ICON_CLASS} /> },
    { href: '/appointments', label: 'Janji Temu Pasien', icon: <UsersRound className={ICON_CLASS} /> },
    { href: '/medical-records', label: 'Rekam Medis & Resep', icon: <FileText className={ICON_CLASS} /> },
    { href: '/profile', label: 'Profil Dokter', icon: <UserRound className={ICON_CLASS} /> },
  ],
  pasien: [
    { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className={ICON_CLASS} /> },
    { href: '/appointments/new', label: 'Buat Janji Baru', icon: <CalendarPlus className={ICON_CLASS} /> },
    { href: '/appointments', label: 'Janji Temu Saya', icon: <CalendarDays className={ICON_CLASS} /> },
    { href: '/medical-records', label: 'Riwayat Medis & Resep', icon: <FileText className={ICON_CLASS} /> },
    { href: '/profile', label: 'Profil Saya', icon: <UserRound className={ICON_CLASS} /> },
  ],
};

function isMobileViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
}

export default function Sidebar({ user }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const items = menuItems[user?.role] || [];
  const displayName = user?.nama_lengkap || user?.name || 'User';
  const initial = displayName.charAt(0).toUpperCase() || 'U';

  function handleNavigate() {
    if (isMobileViewport()) setOpen(false);
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    router.push('/login');
    router.refresh();
  }

  return (
    <SidebarRoot open={open} setOpen={setOpen}>
      <SidebarBody className="h-screen sticky top-0 z-30 justify-between gap-6">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
          {/* Logo header: tinggi dikunci 48px */}
          <Link href="/" className="flex h-12 shrink-0 items-center gap-3 px-1" aria-label="RS Digital Sehat">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white shadow-md shadow-indigo-600/25">
              <Plus className="h-5 w-5" strokeWidth={2.75} />
            </span>
            <span className="flex min-w-0 flex-col justify-center gap-1">
              <SidebarLabel className="text-[15px] font-extrabold tracking-tight text-slate-900">
                RS Digital Sehat
              </SidebarLabel>
              <SidebarLabel className="text-[11px] font-medium text-slate-400">
                Sistem Layanan Terpadu
              </SidebarLabel>
            </span>
          </Link>

          <div className="mx-1 my-4 h-px shrink-0 bg-slate-100" />

          {/* Menu navigasi: tanpa sub-header agar posisi ikon tidak bergeser */}
          <nav className="flex flex-col gap-1">
            {items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <SidebarLink
                  key={item.href}
                  link={item}
                  onClick={handleNavigate}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-indigo-600'
                  )}
                  iconClassName={isActive ? 'text-white' : 'text-slate-400 group-hover/sidebar:text-indigo-600'}
                />
              );
            })}
          </nav>
        </div>

        {/* Profil ringkas + tombol keluar */}
        <div className="flex shrink-0 flex-col gap-1 border-t border-slate-100 pt-3">
          <Link
            href="/profile"
            onClick={handleNavigate}
            className="flex h-12 items-center gap-3 rounded-xl px-1 hover:bg-slate-50 transition-colors"
            title={`${displayName} (${user?.role || 'Pengguna'})`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-700 text-sm font-bold text-white shadow-sm">
              {initial}
            </span>
            <span className="flex min-w-0 flex-col justify-center gap-1">
              <SidebarLabel className="text-xs font-bold text-slate-900">{displayName}</SidebarLabel>
              <SidebarLabel className="text-[11px] font-semibold capitalize text-slate-400">
                {user?.role || 'Pengguna'}
              </SidebarLabel>
            </span>
          </Link>

          <SidebarLink
            link={{ label: 'Keluar Sistem', icon: <LogOut className={ICON_CLASS} /> }}
            onClick={handleLogout}
            className="text-rose-600 hover:bg-rose-50"
            iconClassName="text-rose-500"
          />
        </div>
      </SidebarBody>
    </SidebarRoot>
  );
}
