import { NextResponse } from 'next/server';
import { apiError } from '@/lib/apiError';
import { destroySession } from '@/lib/auth';

export async function POST() {
  try {
    await destroySession();
    return NextResponse.json({ message: 'Berhasil logout' });
  } catch (error) {
    console.error('Logout error:', error);
    return apiError(500, 'Terjadi kesalahan server');
  }
}
