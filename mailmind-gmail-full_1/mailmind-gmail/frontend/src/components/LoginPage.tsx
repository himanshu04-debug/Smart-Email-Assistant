import { authApi } from '@/api'
import { useSearchParams } from 'react-router-dom'

export default function LoginPage() {
  const [params] = useSearchParams()
  const error = params.get('error')

  const handleGoogleLogin = () => {
    // Redirect browser to Spring Boot's OAuth2 authorization endpoint.
    // Spring Security will then redirect to Google, and after login
    // Google will callback to /api/auth/oauth2/callback/google, which
    // Spring handles and then calls our OAuth2SuccessHandler.
    window.location.href = authApi.googleLoginUrl()
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#f8f9fc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }}>
      <div style={{
        background: '#fff', border: '1px solid #e5e7eb',
        borderRadius: 16, padding: '48px 40px', maxWidth: 400,
        width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
      }}>
        {/* Logo */}
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: '#6366f1', display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center', marginBottom: 20
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
               stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <polyline points="2,4 12,13 22,4"/>
          </svg>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>
          MailMind AI
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 32px', lineHeight: 1.6 }}>
          Connect your Gmail to get AI-powered reply suggestions
          and smart email summaries.
        </p>

        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 8, padding: '10px 14px',
            fontSize: 13, color: '#991b1b', marginBottom: 20
          }}>
            Authentication failed. Please try again.
          </div>
        )}

        {/* Google Sign-In button */}
        <button
          onClick={handleGoogleLogin}
          style={{
            width: '100%', padding: '12px 20px',
            borderRadius: 10, border: '1px solid #d1d5db',
            background: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 10, fontSize: 15, fontWeight: 500, color: '#374151',
            transition: 'all 0.15s'
          }}
          onMouseOver={e => (e.currentTarget.style.background = '#f9fafb')}
          onMouseOut={e  => (e.currentTarget.style.background = '#fff')}
        >
          {/* Google SVG logo */}
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>

        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 20, lineHeight: 1.5 }}>
          MailMind requests read, send, and modify access to your Gmail
          so it can sync emails, send replies on your behalf, and index
          them for AI context.
        </p>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 24 }}>
          {['AI Replies', 'Smart Summary', 'Gmail Sync', 'Spring AI + GPT-4o'].map(f => (
            <span key={f} style={{
              padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 500,
              background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe'
            }}>{f}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
