import { NextResponse } from 'next/server';
import { apiError } from '@/lib/apiError';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import {
  validateEmail,
  validateRequired,
  validateMaxLength,
  validateNoHtmlTags,
  validateOptionalPassword,
  sanitize,
} from '@/lib/validation';

export async function GET() {
  try {
    const auth = await requireAuth([]);
    if (auth.error) {
      return apiError(auth.status, auth.error);
    }

    const result = await query(
      `SELECT u.id, u.email, u.name as nama_lengkap, u.name, 
              u.role, u.phone as telepon, u.phone, u.address as alamat, u.address, u.created_at,
              d.polyclinic_id as poli_id, p.name as polyclinic_name
       FROM users u
       LEFT JOIN doctors d ON u.id = d.user_id
       LEFT JOIN polyclinics p ON d.polyclinic_id = p.id
       WHERE u.id = $1`,
      [auth.user.id]
    );

    if (result.rows.length === 0) {
      return apiError(404, 'User tidak ditemukan');
    }

    const row = result.rows[0];
    row.username = row.email.split('@')[0];
    return NextResponse.json({ user: row });
  } catch (error) {
    console.error('Get profile error:', error);
    return apiError(500, 'Terjadi kesalahan server');
  }
}

export async function PUT(request) {
  try {
    const auth = await requireAuth([]);
    if (auth.error) {
      return apiError(auth.status, auth.error);
    }

    const body = await request.json();
    const nama_lengkap = sanitize(body.name || body.nama_lengkap);
    const email = sanitize(body.email);
    const telepon = sanitize(body.phone || body.telepon);
    const alamat = sanitize(body.address || body.alamat);
    const password = body.password;

    const nameErr = validateRequired(nama_lengkap, 'Nama lengkap')
      || validateMaxLength(nama_lengkap, 255, 'Nama lengkap')
      || validateNoHtmlTags(nama_lengkap, 'Nama lengkap');
    if (nameErr) return apiError(400, nameErr);

    const emailErr = validateEmail(email);
    if (emailErr) return apiError(400, emailErr);

    const phoneErr = validateMaxLength(telepon, 20, 'Nomor telepon');
    if (phoneErr) return apiError(400, phoneErr);

    const addrErr = validateMaxLength(alamat, 1000, 'Alamat')
      || validateNoHtmlTags(alamat, 'Alamat');
    if (addrErr) return apiError(400, addrErr);

    const passErr = validateOptionalPassword(password);
    if (passErr) return apiError(400, passErr);

    // Check unique email
    const existing = await query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2',
      [email, auth.user.id]
    );
    if (existing.rows.length > 0) {
      return apiError(409, 'Email sudah digunakan oleh akun lain');
    }

    if (password && password.trim().length >= 6) {
      const hashedPassword = await bcrypt.hash(password.trim(), 10);
      await query(
        `UPDATE users
         SET name = $1, email = $2, phone = $3, address = $4, password = $5, updated_at = NOW()
         WHERE id = $6`,
        [nama_lengkap, email.toLowerCase(), telepon || null, alamat || null, hashedPassword, auth.user.id]
      );
    } else {
      await query(
        `UPDATE users
         SET name = $1, email = $2, phone = $3, address = $4, updated_at = NOW()
         WHERE id = $5`,
        [nama_lengkap, email.toLowerCase(), telepon || null, alamat || null, auth.user.id]
      );
    }

    const updated = await query(
      `SELECT id, email, name, name as nama_lengkap, role, phone as telepon, phone, address as alamat, address 
       FROM users WHERE id = $1`,
      [auth.user.id]
    );

    const userRow = updated.rows[0];
    userRow.username = userRow.email.split('@')[0];
    return NextResponse.json({ user: userRow, message: 'Profil berhasil diperbarui' });
  } catch (error) {
    console.error('Update profile error:', error);
    if (error.code === '22001') {
      return apiError(400, 'Input melebihi batas panjang karakter yang diizinkan');
    }
    return apiError(500, error.message || 'Terjadi kesalahan server');
  }
}
