// ── Auth ──────────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string
  email: string
  name: string
  picture: string
}

export interface TokenPayload {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

// ── Email ──────────────────────────────────────────────────────────────────────
export interface GmailEmail {
  id: string
  gmailId: string
  threadId: string
  subject: string
  senderEmail: string
  senderName: string | null
  snippet: string | null
  bodyPlain: string | null
  bodyHtml: string | null
  labelIds: string[]
  read: boolean
  starred: boolean
  important: boolean
  hasAttachments: boolean
  receivedAt: string        // ISO-8601
}

export interface EmailPage {
  content: GmailEmail[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export type EmailFilter = 'inbox' | 'unread' | 'starred' | 'sent' | 'spam'

// ── AI ────────────────────────────────────────────────────────────────────────
export type ReplyTone = 'PROFESSIONAL' | 'FRIENDLY' | 'CONCISE' | 'FORMAL' | 'EMPATHETIC'

export interface AiReplyResponse {
  emailId: string
  reply: string
  tone: string
  tokensUsed: number
  latencyMs: number
  generatedAt: string
}

export interface AiSummaryResponse {
  emailId: string
  summary: string
  keyPoints: string[]
  actionItems: string[]
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  tone: string
  deadline: string | null
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'
  tokensUsed: number
  latencyMs: number
  generatedAt: string
}

// ── API Responses ─────────────────────────────────────────────────────────────
export interface SendReplyResponse {
  status: 'SENT' | 'ERROR'
  gmailId?: string
  message: string
}

export interface SyncResponse {
  synced: number
  message: string
}
