'use client';

import { createContext, useContext, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const EASE = [0.22, 1, 0.36, 1];
const WIDTH_OPEN = 270;
const WIDTH_CLOSED = 68;

const SidebarContext = createContext(undefined);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

export function SidebarProvider({ children, open: openProp, setOpen: setOpenProp, animate = true }) {
  const [openState, setOpenState] = useState(false);
  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function Sidebar({ children, open, setOpen, animate }) {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
}

export function SidebarBody({ className, children, ...props }) {
  return (
    <>
      <DesktopSidebar className={className} {...props}>
        {children}
      </DesktopSidebar>
      <MobileSidebar>{children}</MobileSidebar>
    </>
  );
}

export function DesktopSidebar({ className, children, ...props }) {
  const { open, setOpen, animate } = useSidebar();

  return (
    <motion.aside
      className={cn(
        'hidden md:flex md:flex-col h-full shrink-0 overflow-hidden bg-white px-3 py-4 border-r border-slate-200/80',
        className
      )}
      initial={false}
      animate={{ width: animate ? (open ? WIDTH_OPEN : WIDTH_CLOSED) : WIDTH_OPEN }}
      transition={{ duration: 0.26, ease: EASE }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      {...props}
    >
      {children}
    </motion.aside>
  );
}

export function MobileSidebar({ className, children }) {
  const { open, setOpen } = useSidebar();

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-colors cursor-pointer"
        aria-label="Buka Navigasi"
      >
        <Menu className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="sidebar-backdrop"
              className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              key="sidebar-drawer"
              className={cn(
                'fixed inset-y-0 left-0 z-[70] flex h-full w-[270px] max-w-[85vw] flex-col justify-between gap-6 bg-white px-3 py-4 shadow-2xl',
                className
              )}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute right-3 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                aria-label="Tutup Navigasi"
              >
                <X className="h-4 w-4" />
              </button>
              {children}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Label teks yang hanya beranimasi lewat opacity + x.
 * Tinggi baris tidak pernah berubah sehingga tidak ada pergeseran vertikal.
 */
export function SidebarLabel({ children, className }) {
  const { open, animate } = useSidebar();
  const visible = animate ? open : true;

  return (
    <motion.span
      initial={false}
      animate={{ opacity: visible ? 1 : 0, x: visible ? 0 : -6 }}
      transition={{ duration: 0.2, ease: EASE }}
      style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}
      className={cn('block min-w-0 leading-none', className)}
      aria-hidden={!visible}
    >
      {children}
    </motion.span>
  );
}

export function SidebarLink({ link, className, iconClassName, onClick, ...props }) {
  const { open, animate } = useSidebar();
  const collapsed = animate && !open;

  const content = (
    <>
      <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center', iconClassName)}>
        {link.icon}
      </span>
      <SidebarLabel className="text-sm font-medium">{link.label}</SidebarLabel>
    </>
  );

  const baseClass = cn(
    'group/sidebar flex h-11 w-full items-center gap-3 rounded-xl px-2 text-left transition-colors duration-150',
    className
  );

  if (!link.href) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(baseClass, 'cursor-pointer')}
        title={collapsed ? link.label : undefined}
        aria-label={link.label}
        {...props}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={link.href}
      onClick={onClick}
      className={baseClass}
      title={collapsed ? link.label : undefined}
      aria-label={link.label}
      {...props}
    >
      {content}
    </Link>
  );
}
