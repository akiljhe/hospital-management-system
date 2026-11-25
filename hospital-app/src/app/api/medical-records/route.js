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
      SELECT rm.id, rm.appointment_id as janji_temu_id, rm.appointment_id, rm.patient_id as pasien_id, rm.doctor_id as dokter_id,
             rm.diagnosis, rm.treatment as tindakan_medis, rm.treatment as tindakan, rm.notes as catatan, rm.created_at,
             u_pat.name as patient_name, u_pat.name as nama_pasien, u_pat.phone as patient_phone,
             u_doc.name as doctor_name, u_doc.name as nama_dokter,
             p.name as polyclinic_name, p.name as nama_poli,
             a.appointment_date as tanggal_booking, a.appointment_date,
             r.id as prescription_id, r.status as prescription_status,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', pi.id,
                   'obat_id', pi.medicine_id,
                   'medicine_id', pi.medicine_id,
                   'nama_obat', m.name,
                   'name', m.name,
                   'jumlah', pi.quantity,
                   'quantity', pi.quantity,
                   'tipe', m.type,
                   'type', m.type
                 )
               ) FILTER (WHERE pi.id IS NOT NULL), '[]'
             ) as prescription_items
      FROM medical_records rm
      JOIN patients pat ON rm.patient_id = pat.id
      JOIN users u_pat ON pat.user_id = u_pat.id
      JOIN doctors d ON rm.doctor_id = d.id
      JOIN users u_doc ON d.user_id = u_doc.id
      LEFT JOIN polyclinics p ON d.polyclinic_id = p.id
      JOIN appointments a ON rm.appointment_id = a.id
      LEFT JOIN prescriptions r ON r.medical_record_id = rm.id
      LEFT JOIN prescription_items pi ON pi.prescription_id = r.id
      LEFT JOIN medicines m ON pi.medicine_id = m.id
    `;
    const params = [];

    if (auth.user.role === 'dokter') {
      params.push(auth.user.id);
      sql += ` WHERE d.user_id = $${params.length}`;
    } else if (auth.user.role === 'pasien') {
      params.push(auth.user.id);
      sql += ` WHERE pat.user_id = $${params.length}`;
    }

    sql += ` GROUP BY rm.id, u_pat.name, u_pat.phone, u_doc.name, p.name, a.appointment_date, r.id, r.status
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
      `SELECT a.*, d.user_id as doctor_user_id 
       FROM appointments a
       JOIN doctors d ON a.doctor_id = d.id
       WHERE a.id = $1`,
      [janji_temu_id]
    );

    if (appointmentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Janji temu tidak ditemukan' }, { status: 404 });
    }

    const appointment = appointmentResult.rows[0];

    if (appointment.doctor_user_id !== auth.user.id) {
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
      'SELECT id FROM medical_records WHERE appointment_id = $1',
      [janji_temu_id]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Rekam medis sudah pernah dibuat untuk janji temu ini' }, { status: 409 });
    }

    // Run transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Insert medical_records (trigger will set appointments status to 'Selesai' and auto-create prescriptions)
      const recordResult = await client.query(
        `INSERT INTO medical_records (appointment_id, patient_id, doctor_id, diagnosis, treatment, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [janji_temu_id, appointment.patient_id, appointment.doctor_id, diagnosis, tindakan_medis, catatan || null]
      );

      const record = recordResult.rows[0];

      // 2. Fetch the auto-created prescription
      const resepResult = await client.query(
        'SELECT id FROM prescriptions WHERE medical_record_id = $1',
        [record.id]
      );

      if (resepResult.rows.length > 0 && prescription_items.length > 0) {
        const resep_id = resepResult.rows[0].id;

        for (const item of prescription_items) {
          const obat_id = item.obat_id || item.medicine_id;
          const jumlah = parseInt(item.jumlah || item.quantity || 1, 10);
          const dosage = item.dosage || item.dosis || '1x sehari sesudah makan';

          if (obat_id && jumlah > 0) {
            // Pastikan obat ada
            const checkObat = await client.query('SELECT id FROM medicines WHERE id = $1', [obat_id]);
            if (checkObat.rows.length > 0) {
              await client.query(
                `INSERT INTO prescription_items (prescription_id, medicine_id, quantity, dosage)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (prescription_id, medicine_id) DO NOTHING`,
                [resep_id, obat_id, jumlah, dosage]
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
