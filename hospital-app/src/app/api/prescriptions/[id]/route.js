import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { validateRequired, sanitize } from '@/lib/validation';

export async function PUT(request, { params }) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const body = await request.json();
    const status = sanitize(body.status);

    const statusErr = validateRequired(status, 'Status resep');
    if (statusErr) {
      return NextResponse.json({ error: statusErr }, { status: 400 });
    }

    // Ambil resep saat ini
    const currentResult = await query(
      `SELECT r.*, rm.pasien_id, u_pat.nama_lengkap as patient_name
       FROM resep r
       JOIN rekam_medis rm ON r.rekam_medis_id = rm.id
       JOIN users u_pat ON rm.pasien_id = u_pat.id
       WHERE r.id = $1`,
      [id]
    );

    if (currentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Resep tidak ditemukan' }, { status: 404 });
    }

    const prescription = currentResult.rows[0];

    // Jalankan UPDATE. Trigger `trg_resep_status` di postgres akan memvalidasi transisi dan mengupdate stok obat
    try {
      const updateResult = await query(
        `UPDATE resep
         SET status = $1
         WHERE id = $2
         RETURNING *`,
        [status, id]
      );

      const updated = updateResult.rows[0];

      // Kirim notifikasi ke pasien jika Siap Diambil
      if (status === 'Siap Diambil') {
        await query(
          `INSERT INTO notifikasi (user_id, judul, pesan, link)
           VALUES ($1, $2, $3, $4)`,
          [
            prescription.pasien_id,
            'Resep Obat Siap Diambil',
            'Resep obat Anda telah disiapkan oleh bagian farmasi dan sekarang siap untuk diambil di loket obat.',
            '/pharmacy',
          ]
        );
      }

      return NextResponse.json({ prescription: updated });
    } catch (dbError) {
      console.error('Trigger or update error:', dbError);
      return NextResponse.json(
        { error: dbError.message || 'Gagal mengubah status resep' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Update prescription error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
