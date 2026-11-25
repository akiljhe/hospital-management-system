import ErrorState from '@/components/ui/ErrorState';

export const metadata = {
  title: 'Akses Ditolak | RS Digital Sehat',
};

export default function ForbiddenPage() {
  return (
    <ErrorState
      code="403"
      title="Anda tidak memiliki akses ke halaman ini"
      description="Halaman ini khusus untuk peran pengguna tertentu di RS Digital Sehat. Silakan kembali ke dashboard sesuai hak akses Anda."
      primaryAction={{ label: 'Ke Dashboard', href: '/dashboard' }}
      secondaryAction={{ label: 'Kembali ke Beranda', href: '/' }}
    />
  );
}
