import { NextResponse } from 'next/server';
import { apiError } from '@/lib/apiError';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { validateRequired, validateMaxLength, validateNoHtmlTags, sanitize } from '@/lib/validation';

export async function GET(request) {
  try {
    const auth = await requireAuth([]);
    if (auth.error) {
      return apiError(auth.status, auth.error);
    }

    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get('appointment_id');

    let sql = `
      SELECT f.id, f.appointment_id, f.rating, f.comment, f.created_at,
             a.appointment_date,
             u_pat.name as patient_name,
             u_doc.name as doctor_name
      FROM feedbacks f
      JOIN appointments a ON f.appointment_id = a.id
      JOIN patients pat ON a.patient_id = pat.id
      JOIN users u_pat ON pat.user_id = u_pat.id
      JOIN doctors d ON a.doctor_id = d.id
      JOIN users u_doc ON d.user_id = u_doc.id
    `;
    const params = [];
    const whereClauses = [];

    if (auth.user.role === 'pasien') {
      params.push(auth.user.id);
      whereClauses.push(`pat.user_id = $${params.length}`);
    } else if (auth.user.role === 'dokter') {
      params.push(auth.user.id);
      whereClauses.push(`d.user_id = $${params.length}`);
    }

    if (appointmentId) {
      params.push(appointmentId);
      whereClauses.push(`f.appointment_id = $${params.length}`);
    }

    if (whereClauses.length > 0) {
      sql += ' WHERE ' + whereClauses.join(' AND ');
    }

    sql += ' ORDER BY f.created_at DESC';

    const result = await query(sql, params);
    return NextResponse.json({ feedbacks: result.rows, data: result.rows });
  } catch (error) {
    console.error('Get feedbacks error:', error);
    return apiError(500, 'Terjadi kesalahan server');
  }
}

export async function POST(request) {
  try {
    const auth = await requireAuth(['pasien']);
    if (auth.error) {
      return apiError(auth.status, auth.error);
    }

    const body = await request.json();
    const appointment_id = body.appointment_id || body.janji_temu_id;
    const rating = Number(body.rating);
    const comment = sanitize(body.comment || body.komentar || '');

    const appErr = validateRequired(appointment_id, 'Janji temu');
    if (appErr) return apiError(400, appErr);

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return apiError(400, 'Rating wajib berupa angka bulat antara 1 sampai 5');
    }

    const commentErr = validateMaxLength(comment, 1000, 'Komentar ulasan')
      || validateNoHtmlTags(comment, 'Komentar ulasan');
    if (commentErr) return apiError(400, commentErr);

    // Pastikan janji temu ada, milik pasien yang login, dan sudah Selesai
    const appRes = await query(
      `SELECT a.id, a.status, pat.user_id as patient_user_id
       FROM appointments a
       JOIN patients pat ON a.patient_id = pat.id
       WHERE a.id = $1`,
      [appointment_id]
    );

    if (appRes.rows.length === 0) {
      return apiError(404, 'Janji temu tidak ditemukan');
    }

    const appointment = appRes.rows[0];
    if (appointment.patient_user_id !== auth.user.id) {
      return apiError(403, 'Anda hanya dapat memberi ulasan pada janji temu Anda sendiri');
    }

    if (appointment.status !== 'Selesai') {
      return apiError(400, 'Ulasan hanya dapat diberikan untuk janji temu yang sudah Selesai');
    }

    const existing = await query('SELECT id FROM feedbacks WHERE appointment_id = $1', [appointment_id]);
    if (existing.rows.length > 0) {
      return apiError(409, 'Ulasan sudah pernah diberikan untuk janji temu ini');
    }

    const insertRes = await query(
      `INSERT INTO feedbacks (appointment_id, rating, comment)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [appointment_id, rating, comment || null]
    );

    return NextResponse.json({ feedback: insertRes.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Create feedback error:', error);
    if (error.code === '23505') {
      return apiError(409, 'Ulasan sudah pernah diberikan untuk janji temu ini');
    }
    return apiError(400, error.message || 'Gagal menyimpan ulasan');
  }
}
