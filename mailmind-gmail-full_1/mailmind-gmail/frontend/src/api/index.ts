import api from './client'
import type {
  AuthUser, EmailPage, GmailEmail, EmailFilter,
  AiReplyResponse, AiSummaryResponse, ReplyTone,
  SendReplyResponse, SyncResponse
} from '@/types'

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  /** Returns the Google OAuth2 URL — frontend opens it for Gmail login */
  googleLoginUrl: (): string =>
    `${window.location.origin}/api/auth/oauth2/authorize/google`,

  me: () =>
    api.get<AuthUser>('/auth/me').then(r => r.data),

  refresh: (refreshToken: string) =>
    api.post<{ accessToken: string; refreshToken: string; expiresIn: number }>(
      '/auth/refresh', { refreshToken }
    ).then(r => r.data),

  logout: () => {
    localStorage.clear()
    window.location.href = '/'
  },
}

// ── Emails ────────────────────────────────────────────────────────────────────
export const emailApi = {
  list: (filter: EmailFilter = 'inbox', page = 0, size = 20) =>
    api.get<EmailPage>('/emails', { params: { filter, page, size } }).then(r => r.data),

  search: (q: string, page = 0, size = 20) =>
    api.get<EmailPage>('/emails/search', { params: { q, page, size } }).then(r => r.data),

  get: (emailId: string) =>
    api.get<GmailEmail>(`/emails/${emailId}`).then(r => r.data),

  star: (emailId: string, starred: boolean) =>
    api.patch(`/emails/${emailId}/star`, null, { params: { starred } }),

  sendReply: (emailId: string, toEmail: string, subject: string, body: string, threadId?: string) =>
    api.post<SendReplyResponse>('/emails/reply', { emailId, toEmail, subject, body, threadId })
      .then(r => r.data),

  sync: () =>
    api.post<SyncResponse>('/emails/sync').then(r => r.data),

  unreadCount: () =>
    api.get<{ count: number }>('/emails/unread-count').then(r => r.data.count),
}

// ── AI ────────────────────────────────────────────────────────────────────────
export const aiApi = {
  generateReply: (emailId: string, sender: string, subject: string, body: string, tone: ReplyTone) =>
    api.post<AiReplyResponse>('/ai/reply', { emailId, sender, subject, body, tone })
      .then(r => r.data),

  summarise: (emailId: string, sender: string, subject: string, body: string) =>
    api.post<AiSummaryResponse>('/ai/summarise', { emailId, sender, subject, body })
      .then(r => r.data),

  getCachedReply: (emailId: string) =>
    api.get(`/ai/reply/${emailId}`).then(r => r.data),

  getCachedSummary: (emailId: string) =>
    api.get(`/ai/summary/${emailId}`).then(r => r.data),
}
