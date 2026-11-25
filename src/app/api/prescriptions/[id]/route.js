import { NextResponse } from 'next/server';
import { apiError } from '@/lib/apiError';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { validateRequired, sanitize } from '@/lib/validation';

export async function PUT(request, { params }) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) {
      return apiError(auth.status, auth.error);
    }

    const { id } = await params;
    const body = await request.json();
    const status = sanitize(body.status);

    const statusErr = validateRequired(status, 'Status resep');
    if (statusErr) {
      return apiError(400, statusErr);
    }

    // Ambil resep saat ini
    const currentResult = await query(
      `SELECT r.*, pat.user_id as patient_user_id, u_pat.name as patient_name
       FROM prescriptions r
       JOIN medical_records rm ON r.medical_record_id = rm.id
       JOIN patients pat ON rm.patient_id = pat.id
       JOIN users u_pat ON pat.user_id = u_pat.id
       WHERE r.id = $1`,
      [id]
    );

    if (currentResult.rows.length === 0) {
      return apiError(404, 'Resep tidak ditemukan');
    }

    const prescription = currentResult.rows[0];

    // Jalankan UPDATE. Trigger `trg_prescription_status_rules` di postgres akan memvalidasi transisi dan memotong stok
    try {
      const updateResult = await query(
        `UPDATE prescriptions
         SET status = $1
         WHERE id = $2
         RETURNING *`,
        [status, id]
      );

      const updated = updateResult.rows[0];

      // Kirim notifikasi ke pasien jika Siap Diambil
      if (status === 'Siap Diambil') {
        await query(
          `INSERT INTO notifications (user_id, title, message, link)
           VALUES ($1, $2, $3, $4)`,
          [
            prescription.patient_user_id,
            'Resep Obat Siap Diambil',
            'Resep obat Anda telah disiapkan oleh bagian farmasi dan sekarang siap untuk diambil di loket obat.',
            '/pharmacy',
          ]
        );
      }

      return NextResponse.json({ prescription: updated });
    } catch (dbError) {
      console.error('Trigger or update error:', dbError);
      return apiError(400, dbError.message || 'Gagal mengubah status resep');
    }
  } catch (error) {
    console.error('Update prescription error:', error);
    return apiError(500, 'Terjadi kesalahan server');
  }
}
