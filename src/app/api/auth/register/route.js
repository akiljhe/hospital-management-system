import { NextResponse } from 'next/server';
import { apiError } from '@/lib/apiError';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { createSession } from '@/lib/auth';
import {
  validateEmail,
  validatePassword,
  validateRequired,
  validatePhone,
  validateMaxLength,
  validateNoHtmlTags,
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
    const nameErr = validateRequired(name, 'Nama lengkap')
      || validateMaxLength(name, 255, 'Nama lengkap')
      || validateNoHtmlTags(name, 'Nama lengkap');
    if (nameErr) errors.push(nameErr);
    const emailErr = validateEmail(email);
    if (emailErr) errors.push(emailErr);
    const passErr = validatePassword(password);
    if (passErr) errors.push(passErr);
    const phoneErr = validatePhone(phone) || validateMaxLength(phone, 20, 'Nomor telepon');
    if (phoneErr) errors.push(phoneErr);
    const addrErr = validateMaxLength(address, 1000, 'Alamat') || validateNoHtmlTags(address, 'Alamat');
    if (addrErr) errors.push(addrErr);

    if (errors.length > 0) {
      return apiError(400, errors.join(', '));
    }

    if (!username) {
      username = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
      if (!username) username = 'pasien_' + Math.floor(Math.random() * 10000);
    }

    // Check existing email
    const existing = await query(
      'SELECT id, email FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    if (existing.rows.length > 0) {
      return apiError(409, 'Email sudah terdaftar');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user with role 'pasien'
    const userResult = await query(
      `INSERT INTO users (name, email, password, role, phone, address)
       VALUES ($1, $2, $3, 'pasien', $4, $5)
       RETURNING id, name, email, role, phone, address`,
      [name, email.toLowerCase(), hashedPassword, phone || null, address || null]
    );

    const user = userResult.rows[0];
    user.nama_lengkap = user.name;
    user.username = username;
    user.telepon = user.phone;
    user.alamat = user.address;

    // Create entry in patients table
    const patResult = await query(
      `INSERT INTO patients (user_id) VALUES ($1) RETURNING id`,
      [user.id]
    );
    user.patient_id = patResult.rows[0].id;

    // Create session
    await createSession(user.id);

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Register error:', error);
    if (error.code === '22001') {
      return apiError(400, 'Input melebihi batas panjang karakter yang diizinkan');
    }
    return apiError(500, 'Terjadi kesalahan server saat mendaftar: ' + error.message);
  }
}
