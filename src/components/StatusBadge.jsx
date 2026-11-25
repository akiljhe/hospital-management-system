'use client';

const statusConfig = {
  Pending: {
    bg: 'bg-amber-50 text-amber-700 border-amber-200/60',
    dot: 'bg-amber-500',
  },
  Approved: {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    dot: 'bg-emerald-500',
  },
  Rejected: {
    bg: 'bg-rose-50 text-rose-700 border-rose-200/60',
    dot: 'bg-rose-500',
  },
  Selesai: {
    bg: 'bg-sky-50 text-sky-700 border-sky-200/60',
    dot: 'bg-sky-500',
  },
  Dibatalkan: {
    bg: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
  },
  'Menunggu Diproses': {
    bg: 'bg-amber-50 text-amber-700 border-amber-200/60',
    dot: 'bg-amber-500',
  },
  'Siap Diambil': {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    dot: 'bg-emerald-500',
  },
  'Sudah Diambil': {
    bg: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
    dot: 'bg-indigo-500',
  },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || {
    bg: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg} shadow-[0_1px_2px_rgba(0,0,0,0.03)]`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{status}</span>
    </span>
  );
}
