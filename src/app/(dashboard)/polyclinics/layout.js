import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function AdminOnlyLayout({ children }) {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect('/forbidden');
  return children;
}
