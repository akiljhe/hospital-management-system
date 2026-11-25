import { NextResponse } from 'next/server';
import { apiError } from '@/lib/apiError';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import {
  validateEmail,
  validatePassword,
  validateRequired,
  validateMaxLength,
  validateNoHtmlTags,
  sanitize,
} from '@/lib/validation';

export async function GET(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) {
      return apiError(auth.status, auth.error);
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    let sql = `
      SELECT u.id, u.email, u.name, u.name as nama_lengkap, 
             u.role, u.phone, u.phone as telepon, u.address, u.address as alamat, u.created_at,
             d.id as doctor_id, d.polyclinic_id as poli_id, p.name as polyclinic_name, p.name as nama_poli,
             pat.id as patient_id
      FROM users u
      LEFT JOIN doctors d ON u.id = d.user_id
      LEFT JOIN polyclinics p ON d.polyclinic_id = p.id
      LEFT JOIN patients pat ON u.id = pat.user_id
    `;
    const params = [];

    if (role) {
      params.push(role);
      sql += ` WHERE u.role = $${params.length}`;
    }

    sql += ' ORDER BY u.created_at DESC';

    const result = await query(sql, params);
    return NextResponse.json({ users: result.rows, data: result.rows });
  } catch (error) {
    console.error('Get users error:', error);
    return apiError(500, 'Terjadi kesalahan server');
  }
}

export async function POST(request) {
  try {
    const auth = await requireAuth(['admin']);
    if (auth.error) {
      return apiError(auth.status, auth.error);
    }

    const body = await request.json();
    const name = sanitize(body.name || body.nama_lengkap);
    const email = sanitize(body.email);
    const password = body.password || 'password123';
    const role = sanitize(body.role || 'pasien');
    const phone = sanitize(body.phone || body.telepon);
    const address = sanitize(body.address || body.alamat);
    const polyclinic_id = body.polyclinic_id || body.poli_id;

    const nameErr = validateRequired(name, 'Nama lengkap')
      || validateMaxLength(name, 255, 'Nama lengkap')
      || validateNoHtmlTags(name, 'Nama lengkap');
    if (nameErr) return apiError(400, nameErr);
    const emailErr = validateEmail(email);
    if (emailErr) return apiError(400, emailErr);
    const passErr = validatePassword(password);
    if (passErr) return apiError(400, passErr);
    const phoneErr = validateMaxLength(phone, 20, 'Nomor telepon');
    if (phoneErr) return apiError(400, phoneErr);
    const addrErr = validateMaxLength(address, 1000, 'Alamat')
      || validateNoHtmlTags(address, 'Alamat');
    if (addrErr) return apiError(400, addrErr);

    if (!['admin', 'dokter', 'pasien'].includes(role)) {
      return apiError(400, 'Role tidak valid');
    }

    if (role === 'dokter' && !polyclinic_id) {
      return apiError(400, 'Poli wajib dipilih untuk dokter');
    }

    // Check unique email
    const existing = await query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    if (existing.rows.length > 0) {
      return apiError(409, 'Email sudah digunakan');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userResult = await query(
      `INSERT INTO users (email, password, name, role, phone, address)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, name, role, phone, address, created_at`,
      [email.toLowerCase(), hashedPassword, name, role, phone || null, address || null]
    );

    const user = userResult.rows[0];

    // Jika dokter, insert ke tabel doctors
    if (role === 'dokter' && polyclinic_id) {
      await query(
        `INSERT INTO doctors (user_id, polyclinic_id)
         VALUES ($1, $2)`,
        [user.id, polyclinic_id]
      );
    } else if (role === 'pasien') {
      await query(
        `INSERT INTO patients (user_id)
         VALUES ($1)
         ON CONFLICT (user_id) DO NOTHING`,
        [user.id]
      );
    }

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === '22001') {
      return apiError(400, 'Input melebihi batas panjang karakter yang diizinkan');
    }
    return apiError(500, error.message || 'Terjadi kesalahan server');
  }
}
