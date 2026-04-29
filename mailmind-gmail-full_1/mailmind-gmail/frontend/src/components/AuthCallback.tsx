import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api'

/**
 * Spring Boot's OAuth2SuccessHandler redirects here after Gmail login:
 * /auth/callback?token=ACCESS&refreshToken=REFRESH&expiresIn=86400
 *
 * We read the tokens, fetch the user profile, persist to the store, then
 * redirect into the app.
 */
export default function AuthCallback() {
  const [params] = useSearchParams()
  const navigate  = useNavigate()
  const setTokens = useAuthStore(s => s.setTokens)

  useEffect(() => {
    const access  = params.get('token')
    const refresh = params.get('refreshToken')

    if (!access || !refresh) {
      navigate('/?error=auth_failed')
      return
    }

    // Store tokens immediately so the API client picks them up
    localStorage.setItem('accessToken',  access)
    localStorage.setItem('refreshToken', refresh)

    // Fetch user profile
    authApi.me()
      .then(user => {
        localStorage.setItem('userId', user.id)
        setTokens(access, refresh, user)
        navigate('/inbox', { replace: true })
      })
      .catch(() => {
        localStorage.clear()
        navigate('/?error=profile_fetch_failed')
      })
  }, [])

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', fontFamily: 'system-ui, sans-serif',
      flexDirection: 'column', gap: 16
    }}>
      <div style={{
        width: 36, height: 36, border: '3px solid #e5e7eb',
        borderTopColor: '#6366f1', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }}/>
      <p style={{ color: '#6b7280', fontSize: 14 }}>Connecting to Gmail…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
