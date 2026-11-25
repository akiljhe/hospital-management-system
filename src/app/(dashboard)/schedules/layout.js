import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function DoctorOrAdminLayout({ children }) {
  const user = await getSession();
  if (!user) redirect('/login');
  if (!['dokter', 'admin'].includes(user.role)) redirect('/forbidden');
  return children;
}
