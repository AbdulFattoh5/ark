import type { BookingResponse } from '../types/booking'

const BASE_URL = 'https://hh.frontend.ark.software'

export async function fetchBookingData(): Promise<BookingResponse> {
  const res = await fetch(`${BASE_URL}/api/booking`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}
