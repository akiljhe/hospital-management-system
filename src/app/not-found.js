import ErrorState from '@/components/ui/ErrorState';
import { getSession } from '@/lib/auth';

export const metadata = {
  title: 'Halaman Tidak Ditemukan | RS Digital Sehat',
};

export default async function NotFound() {
  let isLoggedIn = false;
  try {
    const user = await getSession();
    isLoggedIn = Boolean(user);
  } catch {
    isLoggedIn = false;
  }

  return (
    <ErrorState
      code="404"
      title="Halaman yang Anda cari tidak tersedia"
      description="Maaf, tautan layanan atau halaman RS Digital Sehat yang Anda tuju tidak ditemukan atau telah dipindahkan."
      primaryAction={{ label: 'Kembali ke Beranda', href: '/' }}
      secondaryAction={isLoggedIn ? { label: 'Ke Dashboard', href: '/dashboard' } : null}
    />
  );
}
