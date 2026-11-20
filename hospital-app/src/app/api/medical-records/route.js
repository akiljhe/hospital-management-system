import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import pool from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { validateRequired, sanitize } from '@/lib/validation';

export async function GET(request) {
  try {
    const auth = await requireAuth([]);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    let sql = `
      SELECT rm.id, rm.janji_temu_id, rm.pasien_id, rm.dokter_id,
             rm.diagnosis, rm.tindakan_medis, rm.tindakan_medis as tindakan, rm.catatan, rm.created_at,
             u_pat.nama_lengkap as patient_name, u_pat.telepon as patient_phone,
             u_doc.nama_lengkap as doctor_name,
             p.nama_poli as polyclinic_name,
             jt.tanggal_booking as appointment_date,
             r.id as prescription_id, r.status as prescription_status,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', ri.id,
                   'obat_id', ri.obat_id,
                   'nama_obat', o.nama_obat,
                   'jumlah', ri.jumlah,
                   'tipe', o.tipe
                 )
               ) FILTER (WHERE ri.id IS NOT NULL), '[]'
             ) as prescription_items
      FROM rekam_medis rm
      JOIN users u_pat ON rm.pasien_id = u_pat.id
      JOIN users u_doc ON rm.dokter_id = u_doc.id
      JOIN dokter d ON rm.dokter_id = d.user_id
      LEFT JOIN poli p ON d.poli_id = p.id
      JOIN janji_temu jt ON rm.janji_temu_id = jt.id
      LEFT JOIN resep r ON r.rekam_medis_id = rm.id
      LEFT JOIN resep_item ri ON ri.resep_id = r.id
      LEFT JOIN obat o ON ri.obat_id = o.id
    `;
    const params = [];

    if (auth.user.role === 'dokter') {
      params.push(auth.user.id);
      sql += ` WHERE rm.dokter_id = $${params.length}`;
    } else if (auth.user.role === 'pasien') {
      params.push(auth.user.id);
      sql += ` WHERE rm.pasien_id = $${params.length}`;
    }

    sql += ` GROUP BY rm.id, u_pat.nama_lengkap, u_pat.telepon, u_doc.nama_lengkap, p.nama_poli, jt.tanggal_booking, r.id, r.status
             ORDER BY rm.created_at DESC`;

    const result = await query(sql, params);
    return NextResponse.json({ records: result.rows, data: result.rows });
  } catch (error) {
    console.error('Get medical records error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireAuth(['dokter']);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const janji_temu_id = body.janji_temu_id || body.appointment_id;
    const diagnosis = sanitize(body.diagnosis);
    const tindakan_medis = sanitize(body.tindakan_medis || body.tindakan || body.examination || body.treatment_plan || 'Pemeriksaan fisik umum');
    const catatan = sanitize(body.catatan || body.notes || body.symptoms || '');
    const prescription_items = body.prescription_items || body.resep_items || [];

    // Validate
    const errors = [];
    const janjiErr = validateRequired(janji_temu_id, 'Janji temu');
    if (janjiErr) errors.push(janjiErr);
    const diagErr = validateRequired(diagnosis, 'Diagnosis');
    if (diagErr) errors.push(diagErr);

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(', ') }, { status: 400 });
    }

    // Verify appointment exists, is Approved, and belongs to this doctor
    const appointmentResult = await query(
      'SELECT * FROM janji_temu WHERE id = $1',
      [janji_temu_id]
    );

    if (appointmentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Janji temu tidak ditemukan' }, { status: 404 });
    }

    const appointment = appointmentResult.rows[0];

    if (appointment.dokter_id !== auth.user.id) {
      return NextResponse.json({ error: 'Anda hanya dapat menulis rekam medis untuk janji temu Anda sendiri' }, { status: 403 });
    }

    if (appointment.status !== 'Approved') {
      return NextResponse.json(
        { error: `Rekam medis hanya dapat dibuat untuk janji temu berstatus Approved (saat ini: ${appointment.status})` },
        { status: 400 }
      );
    }

    // Check if record already exists
    const existing = await query(
      'SELECT id FROM rekam_medis WHERE janji_temu_id = $1',
      [janji_temu_id]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Rekam medis sudah pernah dibuat untuk janji temu ini' }, { status: 409 });
    }

    // Run transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Insert rekam_medis (trigger will set janji_temu status to 'Selesai' and create resep)
      const recordResult = await client.query(
        `INSERT INTO rekam_medis (janji_temu_id, pasien_id, dokter_id, diagnosis, tindakan_medis, catatan)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [janji_temu_id, appointment.pasien_id, auth.user.id, diagnosis, tindakan_medis, catatan || null]
      );

      const record = recordResult.rows[0];

      // 2. Fetch the auto-created prescription
      const resepResult = await client.query(
        'SELECT id FROM resep WHERE rekam_medis_id = $1',
        [record.id]
      );

      if (resepResult.rows.length > 0 && prescription_items.length > 0) {
        const resep_id = resepResult.rows[0].id;

        for (const item of prescription_items) {
          const obat_id = item.obat_id || item.medicine_id;
          const jumlah = parseInt(item.jumlah || item.quantity || 1, 10);

          if (obat_id && jumlah > 0) {
            // Pastikan obat ada
            const checkObat = await client.query('SELECT id FROM obat WHERE id = $1', [obat_id]);
            if (checkObat.rows.length > 0) {
              await client.query(
                `INSERT INTO resep_item (resep_id, obat_id, jumlah)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (resep_id, obat_id) DO NOTHING`,
                [resep_id, obat_id, jumlah]
              );
            }
          }
        }
      }

      await client.query('COMMIT');

      return NextResponse.json({ record }, { status: 201 });
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create medical record error:', error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server' }, { status: 500 });
  }
}
