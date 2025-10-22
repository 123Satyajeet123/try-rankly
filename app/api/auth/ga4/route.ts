import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

export async function GET(request: NextRequest) {
  console.log('🔐 [ga4-auth] Starting GA4 OAuth flow')

  const { searchParams } = new URL(request.url)
  const returnUrl = searchParams.get('returnUrl') || '/agent-analytics'

  // Clear any existing session to ensure fresh GA4 authentication
  try {
    const { clearSession } = await import('@/lib/session')
    await clearSession()
    console.log('🧹 [ga4-auth] Cleared existing session for fresh GA4 authentication')
  } catch (error) {
    console.warn('⚠️ [ga4-auth] Failed to clear existing session:', error)
  }

  // Generate PKCE parameters
  const codeVerifier = randomBytes(32).toString('base64url')
  const codeChallenge = require('crypto')
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')

  const clientId = process.env.GA4_CLIENT_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/google/callback` // Unified callback

  if (!clientId) {
    console.error('❌ [ga4-auth] Missing GA4_CLIENT_ID')
    return NextResponse.json({ error: 'Missing GA4_CLIENT_ID' }, { status: 500 })
  }

  console.log('🔐 [ga4-auth] Generated GA4 OAuth URL:', {
    redirectUri,
    clientId: clientId?.substring(0, 20) + '...',
    authUrl: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}...`
  })

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
    access_type: 'offline',
    prompt: 'consent',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: 'ga4_oauth' // Indicate GA4 flow
  })

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

  const response = NextResponse.redirect(authUrl)

  // Store PKCE parameters and return URL in cookies
  response.cookies.set('code_verifier', codeVerifier, { // Use generic code_verifier for unified callback
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600 // 10 minutes
  })

  response.cookies.set('return_url', returnUrl, { // Use generic return_url for unified callback
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600 // 10 minutes
  })

  return response
}

