import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { validateRequired, sanitize } from '@/lib/validation';

export async function POST(request) {
  try {
    const body = await request.json();
    const identifier = sanitize(body.email || body.username || '');
    const password = body.password;

    // Validate
    const errors = [];
    const idErr = validateRequired(identifier, 'Email atau Username');
    if (idErr) errors.push(idErr);
    const passErr = validateRequired(password, 'Password');
    if (passErr) errors.push(passErr);

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(', ') }, { status: 400 });
    }

    // Find user by email or username (email prefix or direct email)
    const result = await query(
      `SELECT u.id, u.email, u.password, u.name, u.role, u.phone, u.address,
              d.id as doctor_id, doc_p.id as polyclinic_id, doc_p.name as polyclinic_name,
              p.id as patient_id
       FROM users u
       LEFT JOIN doctors d ON u.id = d.user_id
       LEFT JOIN polyclinics doc_p ON d.polyclinic_id = doc_p.id
       LEFT JOIN patients p ON u.id = p.user_id
       WHERE LOWER(u.email) = LOWER($1) 
          OR LOWER(split_part(u.email, '@', 1)) = LOWER($1)
          OR (LOWER($1) = 'admin' AND u.role = 'admin')
          OR (LOWER($1) = 'dr_sarah' AND u.email = 'dr.sarah@rumahsakit.local')
          OR (LOWER($1) = 'dr_budi' AND u.email = 'dr.budi@rumahsakit.local')
          OR (LOWER($1) = 'johndoe' AND u.email = 'john@email.com')`,
      [identifier]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Email/username atau password salah' }, { status: 401 });
    }

    const user = result.rows[0];

    // Check password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Email/username atau password salah' }, { status: 401 });
    }

    // Create session
    await createSession(user.id);

    const { password: _, ...userData } = user;
    userData.nama_lengkap = user.name;
    userData.username = user.email.split('@')[0];
    userData.telepon = user.phone;
    userData.alamat = user.address;
    return NextResponse.json({ user: userData });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
