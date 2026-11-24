import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function DoctorOrAdminLayout({ children }) {
  const user = await getSession();
  if (!user || !['dokter', 'admin'].includes(user.role)) redirect('/dashboard');
  return children;
}
