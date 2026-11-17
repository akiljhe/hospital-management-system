import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { createSession } from '@/lib/auth';
import {
  validateEmail,
  validatePassword,
  validateRequired,
  validatePhone,
  sanitize,
} from '@/lib/validation';

export async function POST(request) {
  try {
    const body = await request.json();

    const name = sanitize(body.name || body.nama_lengkap);
    const email = sanitize(body.email);
    let username = sanitize(body.username);
    const password = body.password;
    const phone = sanitize(body.phone || body.telepon);
    const address = sanitize(body.address || body.alamat);

    // Validate
    const errors = [];
    const nameErr = validateRequired(name, 'Nama lengkap');
    if (nameErr) errors.push(nameErr);
    const emailErr = validateEmail(email);
    if (emailErr) errors.push(emailErr);
    const passErr = validatePassword(password);
    if (passErr) errors.push(passErr);
    const phoneErr = validatePhone(phone);
    if (phoneErr) errors.push(phoneErr);

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(', ') }, { status: 400 });
    }

    if (!username) {
      username = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
      if (!username) username = 'pasien_' + Math.floor(Math.random() * 10000);
    }

    // Check existing email or username
    const existing = await query(
      'SELECT id, email, username FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($2)',
      [email, username]
    );
    if (existing.rows.length > 0) {
      const match = existing.rows[0];
      if (match.email.toLowerCase() === email.toLowerCase()) {
        return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 });
      } else {
        username = `${username}_${Math.floor(Math.random() * 1000)}`;
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user with role 'pasien'
    const userResult = await query(
      `INSERT INTO users (username, email, password_hash, nama_lengkap, role, telepon, alamat)
       VALUES ($1, $2, $3, $4, 'pasien', $5, $6)
       RETURNING id, username, email, nama_lengkap, role, telepon, alamat`,
      [username, email.toLowerCase(), hashedPassword, name, phone || null, address || null]
    );

    const user = userResult.rows[0];
    user.name = user.nama_lengkap;

    // Create session
    await createSession(user.id);

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server saat mendaftar: ' + error.message }, { status: 500 });
  }
}
