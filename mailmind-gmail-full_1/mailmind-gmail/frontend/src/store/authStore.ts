import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@/types'

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean

  setTokens: (access: string, refresh: string, user: AuthUser) => void
  setUser:   (user: AuthUser) => void
  logout:    () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:            null,
      accessToken:     null,
      refreshToken:    null,
      isAuthenticated: false,

      setTokens: (access, refresh, user) => {
        localStorage.setItem('accessToken',  access)
        localStorage.setItem('refreshToken', refresh)
        localStorage.setItem('userId', user.id)
        set({ accessToken: access, refreshToken: refresh, user, isAuthenticated: true })
      },

      setUser: (user) => set({ user }),

      logout: () => {
        localStorage.clear()
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
      },
    }),
    {
      name: 'mailmind-auth',
      partialize: (state) => ({
        user:            state.user,
        accessToken:     state.accessToken,
        refreshToken:    state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
