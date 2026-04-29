import { create } from 'zustand'
import type { GmailEmail, AiReplyResponse, AiSummaryResponse, EmailFilter, ReplyTone } from '@/types'

interface EmailState {
  selectedEmail:  GmailEmail | null
  filter:         EmailFilter
  searchQuery:    string
  aiReply:        AiReplyResponse | null
  aiSummary:      AiSummaryResponse | null
  aiLoading:      boolean
  aiTab:          'summary' | 'reply' | 'context'
  selectedTone:   ReplyTone
  isSending:      boolean
  sendSuccess:    boolean | null

  setSelectedEmail: (email: GmailEmail | null) => void
  setFilter:        (filter: EmailFilter) => void
  setSearchQuery:   (q: string) => void
  setAiReply:       (r: AiReplyResponse | null) => void
  setAiSummary:     (s: AiSummaryResponse | null) => void
  setAiLoading:     (v: boolean) => void
  setAiTab:         (tab: 'summary' | 'reply' | 'context') => void
  setSelectedTone:  (tone: ReplyTone) => void
  setIsSending:     (v: boolean) => void
  setSendSuccess:   (v: boolean | null) => void
  clearAiResults:   () => void
}

export const useEmailStore = create<EmailState>((set) => ({
  selectedEmail: null,
  filter:        'inbox',
  searchQuery:   '',
  aiReply:       null,
  aiSummary:     null,
  aiLoading:     false,
  aiTab:         'summary',
  selectedTone:  'PROFESSIONAL',
  isSending:     false,
  sendSuccess:   null,

  setSelectedEmail: (email) => set({ selectedEmail: email, aiReply: null, aiSummary: null, sendSuccess: null }),
  setFilter:        (filter) => set({ filter, selectedEmail: null, searchQuery: '', aiReply: null, aiSummary: null }),
  setSearchQuery:   (searchQuery) => set({ searchQuery }),
  setAiReply:       (aiReply) => set({ aiReply }),
  setAiSummary:     (aiSummary) => set({ aiSummary }),
  setAiLoading:     (aiLoading) => set({ aiLoading }),
  setAiTab:         (aiTab) => set({ aiTab }),
  setSelectedTone:  (selectedTone) => set({ selectedTone }),
  setIsSending:     (isSending) => set({ isSending }),
  setSendSuccess:   (sendSuccess) => set({ sendSuccess }),
  clearAiResults:   () => set({ aiReply: null, aiSummary: null }),
}))
