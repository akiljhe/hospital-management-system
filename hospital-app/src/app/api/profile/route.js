import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { validateEmail, validateRequired, sanitize } from '@/lib/validation';

export async function GET() {
  try {
    const auth = await requireAuth([]);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const result = await query(
      `SELECT u.id, u.username, u.email, u.nama_lengkap, u.nama_lengkap as name, 
              u.role, u.telepon, u.telepon as phone, u.alamat, u.alamat as address, u.foto, u.created_at,
              d.poli_id, p.nama_poli as polyclinic_name
       FROM users u
       LEFT JOIN dokter d ON u.id = d.user_id
       LEFT JOIN poli p ON d.poli_id = p.id
       WHERE u.id = $1`,
      [auth.user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const auth = await requireAuth([]);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const nama_lengkap = sanitize(body.name || body.nama_lengkap);
    const email = sanitize(body.email);
    const telepon = sanitize(body.phone || body.telepon);
    const alamat = sanitize(body.address || body.alamat);
    const password = body.password;

    const nameErr = validateRequired(nama_lengkap, 'Nama lengkap');
    if (nameErr) return NextResponse.json({ error: nameErr }, { status: 400 });
    const emailErr = validateEmail(email);
    if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 });

    // Check unique email
    const existing = await query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2',
      [email, auth.user.id]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Email sudah digunakan oleh akun lain' }, { status: 409 });
    }

    if (password && password.length >= 6) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await query(
        `UPDATE users
         SET nama_lengkap = $1, email = $2, telepon = $3, alamat = $4, password_hash = $5
         WHERE id = $6`,
        [nama_lengkap, email.toLowerCase(), telepon || null, alamat || null, hashedPassword, auth.user.id]
      );
    } else {
      await query(
        `UPDATE users
         SET nama_lengkap = $1, email = $2, telepon = $3, alamat = $4
         WHERE id = $5`,
        [nama_lengkap, email.toLowerCase(), telepon || null, alamat || null, auth.user.id]
      );
    }

    const updated = await query(
      `SELECT id, username, email, nama_lengkap, nama_lengkap as name, role, telepon, telepon as phone, alamat, alamat as address 
       FROM users WHERE id = $1`,
      [auth.user.id]
    );

    return NextResponse.json({ user: updated.rows[0], message: 'Profil berhasil diperbarui' });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan server' }, { status: 500 });
  }
}
