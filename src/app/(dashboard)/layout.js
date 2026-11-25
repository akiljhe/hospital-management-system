import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import DashboardLayout from '@/components/DashboardLayout';

export default async function Layout({ children }) {
  const user = await getSession();
  if (!user) {
    redirect('/login');
  }

  return <DashboardLayout initialUser={user}>{children}</DashboardLayout>;
}
