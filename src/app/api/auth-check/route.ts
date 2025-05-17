import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  // Get all cookies
  const cookieStore = cookies();
  const allCookies = cookieStore.getAll();
  
  // Filter out sensitive information if needed
  const safeCookies = allCookies.map(cookie => ({
    name: cookie.name,
    // Don't include the value for sensitive cookies, just indicate they exist
    value: cookie.name.includes('firebase') ? '[REDACTED]' : cookie.value.substring(0, 20) + '...',
  }));
  
  return NextResponse.json({
    status: 'success',
    message: 'Auth check endpoint',
    cookiesCount: allCookies.length,
    cookies: safeCookies,
    timestamp: new Date().toISOString(),
  });
} 