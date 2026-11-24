import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function AdminOnlyLayout({ children }) {
  const user = await getSession();
  if (!user || user.role !== 'admin') redirect('/dashboard');
  return children;
}
