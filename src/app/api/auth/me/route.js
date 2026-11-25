import { NextResponse } from 'next/server';
import { apiError } from '@/lib/apiError';
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
    return apiError(500, 'Terjadi kesalahan server');
  }
}
