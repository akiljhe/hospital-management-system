import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    const auth = await requireAuth([]);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';

    let sql = `
      SELECT id, user_id, title as judul, title, message as pesan, message, 
             is_read as sudah_dibaca, is_read, link, created_at
      FROM notifications
      WHERE user_id = $1
    `;
    const params = [auth.user.id];

    if (unreadOnly) {
      sql += ' AND is_read = false';
    }

    sql += ' ORDER BY created_at DESC LIMIT 50';

    const result = await query(sql, params);
    const unreadCountResult = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [auth.user.id]
    );

    return NextResponse.json({
      notifications: result.rows,
      data: result.rows,
      unreadCount: parseInt(unreadCountResult.rows[0].count, 10),
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireAuth([]);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const { ids, all } = body;

    if (all) {
      await query('UPDATE notifications SET is_read = true WHERE user_id = $1', [auth.user.id]);
    } else if (Array.isArray(ids) && ids.length > 0) {
      await query(
        'UPDATE notifications SET is_read = true WHERE user_id = $1 AND id = ANY($2)',
        [auth.user.id, ids]
      );
    }

    return NextResponse.json({ message: 'Notifikasi berhasil ditandai sebagai dibaca' });
  } catch (error) {
    console.error('Update notifications error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
