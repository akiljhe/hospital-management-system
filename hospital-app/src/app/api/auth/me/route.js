import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ user: null, authenticated: false }, { status: 200 });
    }

    return NextResponse.json({
      user: {
        ...user,
        name: user.name || user.nama_lengkap,
        nama_lengkap: user.name || user.nama_lengkap,
        username: user.username || user.email.split('@')[0],
      },
    });
  } catch (error) {
    console.error('Auth me error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
