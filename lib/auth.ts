import { cookies } from 'next/headers'
import { createHash } from 'crypto'

const SESSION_COOKIE_NAME = 'dashboard_session'
const SESSION_MAX_AGE = 60 * 60 * 24 // 24 hours

// Generate a session token
function generateSessionToken(password: string): string {
  const secret = process.env.SESSION_SECRET || 'default-secret'
  const timestamp = Math.floor(Date.now() / 1000 / 3600) // Hour-based for some rotation
  return createHash('sha256')
    .update(`${password}:${secret}:${timestamp}`)
    .digest('hex')
}

// Verify password and create session
export async function login(password: string): Promise<boolean> {
  const correctPassword = process.env.DASHBOARD_PASSWORD

  if (!correctPassword) {
    console.error('DASHBOARD_PASSWORD not set')
    return false
  }

  if (password !== correctPassword) {
    return false
  }

  // Set session cookie
  const token = generateSessionToken(password)
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })

  return true
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const correctPassword = process.env.DASHBOARD_PASSWORD

  // If no password is set, allow access (for development)
  if (!correctPassword) {
    return true
  }

  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

  if (!sessionCookie) {
    return false
  }

  // Verify the token (check current and previous hour to handle rotation)
  const expectedToken = generateSessionToken(correctPassword)
  const secret = process.env.SESSION_SECRET || 'default-secret'
  const previousHourTimestamp = Math.floor(Date.now() / 1000 / 3600) - 1
  const previousToken = createHash('sha256')
    .update(`${correctPassword}:${secret}:${previousHourTimestamp}`)
    .digest('hex')

  return (
    sessionCookie.value === expectedToken ||
    sessionCookie.value === previousToken
  )
}

// Logout - clear session
export async function logout(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}
