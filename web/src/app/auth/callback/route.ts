import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Auth Callback Route
 *
 * Handles both:
 * 1. Email magic link callback (code exchange)
 * 2. OAuth provider callback
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/dashboard'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    console.error('Auth callback error:', error, errorDescription)
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(errorDescription || error)}`, request.url))
  }

  // Exchange code for session
  if (code) {
    const supabase = await createClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('Code exchange error:', exchangeError)
      return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(exchangeError.message)}`, request.url))
    }
  }

  // Redirect to the intended page
  return NextResponse.redirect(new URL(next, request.url))
}
