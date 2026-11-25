import ErrorState from '@/components/ui/ErrorState';

export const metadata = {
  title: 'Pemeliharaan Sistem | RS Digital Sehat',
};

export default function MaintenancePage() {
  return (
    <ErrorState
      code="503"
      title="Sistem sedang dalam pemeliharaan"
      description="Kami sedang melakukan peningkatan layanan RS Digital Sehat agar pengalaman Anda lebih cepat dan aman. Mohon coba kembali beberapa saat lagi."
      primaryAction={{ label: 'Kembali ke Beranda', href: '/' }}
    />
  );
}
