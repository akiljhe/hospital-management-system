'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { TriangleAlert, CircleCheck, CircleAlert, Info, X, LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPE_STYLES = {
  danger: {
    icon: TriangleAlert,
    iconWrap: 'bg-rose-50 text-rose-600 ring-rose-100',
    button: 'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500/40 shadow-rose-600/25',
  },
  success: {
    icon: CircleCheck,
    iconWrap: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    button: 'bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-500/40 shadow-emerald-600/25',
  },
  warning: {
    icon: CircleAlert,
    iconWrap: 'bg-amber-50 text-amber-600 ring-amber-100',
    button: 'bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-500/40 shadow-amber-500/25',
  },
  info: {
    icon: Info,
    iconWrap: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
    button: 'bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-500/40 shadow-indigo-600/25',
  },
};

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Konfirmasi',
  message = 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  type = 'info',
  loading = false,
}) {
  const style = TYPE_STYLES[type] || TYPE_STYLES.info;
  const Icon = style.icon;

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape' && !loading) onClose?.();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="confirm-modal"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => !loading && onClose?.()}
            aria-hidden="true"
          />

          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            aria-describedby="confirm-modal-message"
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_24px_60px_-12px_rgba(15,23,42,0.35)] sm:p-7"
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-40 cursor-pointer"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col items-center text-center">
              <span className={cn('flex h-14 w-14 items-center justify-center rounded-2xl ring-8', style.iconWrap)}>
                <Icon className="h-7 w-7" />
              </span>
              <h2 id="confirm-modal-title" className="mt-5 text-lg font-extrabold tracking-tight text-slate-900">
                {title}
              </h2>
              <p id="confirm-modal-message" className="mt-2 text-sm leading-relaxed text-slate-500">
                {message}
              </p>
            </div>

            <div className="mt-7 flex flex-col-reverse gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                autoFocus
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-md transition-colors focus:outline-none focus-visible:ring-4 disabled:opacity-70 cursor-pointer',
                  style.button
                )}
              >
                {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
                <span>{loading ? 'Memproses...' : confirmText}</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
