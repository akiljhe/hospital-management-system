import { apiError } from '@/lib/apiError';

function notFoundResponse() {
  return apiError(404, 'Endpoint API tidak ditemukan');
}

export const GET = notFoundResponse;
export const POST = notFoundResponse;
export const PUT = notFoundResponse;
export const PATCH = notFoundResponse;
export const DELETE = notFoundResponse;
export const HEAD = notFoundResponse;
export const OPTIONS = notFoundResponse;
