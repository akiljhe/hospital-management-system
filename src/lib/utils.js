import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const MONTHS_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const DAYS_MAP = {
  0: 'Minggu',
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu',
};

export function toLocalDateISO(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getDayName(date) {
  const d = new Date(date);
  return DAYS_MAP[d.getDay()];
}

export function formatDate(date) {
  if (!date) return '-';

  // String 'YYYY-MM-DD' diproses langsung agar tidak terdistorsi konversi timezone UTC
  if (typeof date === 'string') {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const [, year, month, day] = match;
      return `${Number(day)} ${MONTHS_ID[Number(month) - 1]} ${year}`;
    }
  }

  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatTime(time) {
  if (!time) return '-';
  return time.substring(0, 5);
}

export function formatDateTime(date) {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

export const STATUS_COLORS = {
  Pending: 'bg-yellow-100 text-yellow-800',
  Approved: 'bg-green-100 text-green-800',
  Rejected: 'bg-red-100 text-red-800',
  Selesai: 'bg-blue-100 text-blue-800',
  Dibatalkan: 'bg-gray-100 text-gray-800',
  'Menunggu Diproses': 'bg-yellow-100 text-yellow-800',
  'Siap Diambil': 'bg-green-100 text-green-800',
  'Sudah Diambil': 'bg-blue-100 text-blue-800',
};

export const DAYS_OPTIONS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
