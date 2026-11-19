import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function DELETE(request, { params }) {
  try {
    const auth = await requireAuth(['dokter', 'admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;

    // Pastikan schedule milik dokter ini jika bukan admin
    let checkSql = 'SELECT * FROM jadwal_dokter WHERE id = $1';
    let checkParams = [id];

    if (auth.user.role === 'dokter') {
      checkSql += ' AND dokter_id = $2';
      checkParams.push(auth.user.id);
    }

    const check = await query(checkSql, checkParams);
    if (check.rows.length === 0) {
      return NextResponse.json({ error: 'Jadwal tidak ditemukan atau bukan milik Anda' }, { status: 404 });
    }

    // Cek apakah ada janji temu aktif di jadwal ini
    const activeApp = await query(
      "SELECT id FROM janji_temu WHERE jadwal_id = $1 AND status IN ('Pending', 'Approved')",
      [id]
    );

    if (activeApp.rows.length > 0) {
      return NextResponse.json(
        { error: 'Jadwal tidak dapat dihapus karena masih memiliki janji temu yang aktif' },
        { status: 400 }
      );
    }

    await query('DELETE FROM jadwal_dokter WHERE id = $1', [id]);

    return NextResponse.json({ message: 'Jadwal berhasil dihapus' });
  } catch (error) {
    console.error('Delete schedule error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
