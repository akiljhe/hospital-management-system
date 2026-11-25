import { NextResponse } from 'next/server';

export function apiError(status, message) {
  return NextResponse.json({ error: message }, { status });
}
