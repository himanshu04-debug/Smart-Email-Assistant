import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import DOMPurify from 'dompurify'
import toast from 'react-hot-toast'
import { emailApi, aiApi } from '@/api'
import { useEmailStore } from '@/store/emailStore'

export default function EmailDetail() {
  const qc = useQueryClient()
  const {
    selectedEmail, aiReply, aiSummary,
    setAiReply, setAiSummary, setAiLoading, setAiTab,
    selectedTone, isSending, setIsSending, setSendSuccess,
  } = useEmailStore()

  const [replyText, setReplyText] = useState('')
  const [showReplyBox, setShowReplyBox] = useState(false)

  const sendMutation = useMutation({
    mutationFn: () => emailApi.sendReply(
      selectedEmail!.id,
      selectedEmail!.senderEmail,
      selectedEmail!.subject,
      replyText,
      selectedEmail!.threadId
    ),
    onMutate: () => setIsSending(true),
    onSuccess: (res) => {
      setIsSending(false)
      setSendSuccess(true)
      toast.success('Reply sent via Gmail ✓')
      setShowReplyBox(false)
      setReplyText('')
      qc.invalidateQueries({ queryKey: ['emails'] })
    },
    onError: (err: any) => {
      setIsSending(false)
      toast.error(err?.response?.data?.message ?? 'Failed to send reply')
    },
  })

  const summariseMutation = useMutation({
    mutationFn: () => aiApi.summarise(
      selectedEmail!.id,
      selectedEmail!.senderEmail,
      selectedEmail!.subject,
      selectedEmail!.bodyPlain ?? selectedEmail!.snippet ?? ''
    ),
    onMutate: () => { setAiLoading(true); setAiTab('summary') },
    onSuccess: (res) => { setAiSummary(res); setAiLoading(false) },
    onError: () => { setAiLoading(false); toast.error('Summarisation failed') },
  })

  const replyMutation = useMutation({
    mutationFn: () => aiApi.generateReply(
      selectedEmail!.id,
      selectedEmail!.senderEmail,
      selectedEmail!.subject,
      selectedEmail!.bodyPlain ?? selectedEmail!.snippet ?? '',
      selectedTone
    ),
    onMutate: () => { setAiLoading(true); setAiTab('reply') },
    onSuccess: (res) => {
      setAiReply(res)
      setAiLoading(false)
      setReplyText(res.reply)
      setShowReplyBox(true)
    },
    onError: () => { setAiLoading(false); toast.error('Reply generation failed') },
  })

  if (!selectedEmail) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 14, flexDirection: 'column', gap: 12, background: '#f9fafb' }}>
        <div style={{ fontSize: 40 }}>✉</div>
        <p>Select an email to read</p>
      </div>
    )
  }

  const email = selectedEmail
  const receivedDate = format(new Date(email.receivedAt), 'PPpp')

  const sanitizedHtml = email.bodyHtml
    ? DOMPurify.sanitize(email.bodyHtml, { USE_PROFILES: { html: true } })
    : null

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#fff' }}>

      {/* Header */}
      <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #e5e7eb' }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: '#111827', marginBottom: 10, lineHeight: 1.3 }}>
          {email.subject || '(no subject)'}
        </h2>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#6366f1', flexShrink: 0 }}>
              {(email.senderName || email.senderEmail || '?')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>
                {email.senderName || email.senderEmail}
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>{email.senderEmail}</div>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 11, color: '#9ca3af' }}>{receivedDate}</div>
        </div>

        {/* Labels */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {email.labelIds.filter(l => !['INBOX','UNREAD','CATEGORY_PERSONAL'].includes(l)).map(l => (
            <span key={l} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: '#f3f4f6', color: '#6b7280', fontWeight: 500 }}>
              {l.replace('CATEGORY_', '').toLowerCase()}
            </span>
          ))}
          {email.hasAttachments && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: '#fef3c7', color: '#92400e', fontWeight: 500 }}>📎 attachments</span>}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => replyMutation.mutate()}
            disabled={replyMutation.isPending}
            style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 500, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: replyMutation.isPending ? 0.7 : 1 }}
          >
            <span style={{ display: 'inline-block', animation: replyMutation.isPending ? 'spin 0.7s linear infinite' : 'none' }}>
              {replyMutation.isPending ? '↺' : '✦'}
            </span>
            {replyMutation.isPending ? 'Generating…' : 'AI Generate Reply'}
          </button>

          <button
            onClick={() => summariseMutation.mutate()}
            disabled={summariseMutation.isPending}
            style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #99f6e4', background: '#f0fdfa', color: '#0f766e', fontWeight: 500, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: summariseMutation.isPending ? 0.7 : 1 }}
          >
            <span style={{ display: 'inline-block', animation: summariseMutation.isPending ? 'spin 0.7s linear infinite' : 'none' }}>
              {summariseMutation.isPending ? '↺' : '☰'}
            </span>
            {summariseMutation.isPending ? 'Summarising…' : 'AI Summarise'}
          </button>

          <button
            onClick={() => { setShowReplyBox(v => !v); if (!replyText && aiReply) setReplyText(aiReply.reply) }}
            style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 500, fontSize: 13, cursor: 'pointer' }}
          >
            ↩ Reply
          </button>
        </div>
      </div>

      {/* Email body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {sanitizedHtml ? (
          <div
            className="fade-in"
            style={{ fontSize: 14, lineHeight: 1.75, color: '#374151' }}
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        ) : (
          <div className="fade-in" style={{ fontSize: 14, lineHeight: 1.75, color: '#374151', whiteSpace: 'pre-wrap' }}>
            {email.bodyPlain || email.snippet || 'No content available.'}
          </div>
        )}
      </div>

      {/* Reply compose box */}
      {showReplyBox && (
        <div style={{ borderTop: '1px solid #e5e7eb', padding: '14px 20px', background: '#fafafa' }}>
          {aiReply && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: '#eef2ff', color: '#6366f1', fontWeight: 600, border: '1px solid #c7d2fe' }}>
                ✦ AI Generated · {aiReply.tone} · {aiReply.tokensUsed} tokens · {(aiReply.latencyMs / 1000).toFixed(1)}s
              </span>
            </div>
          )}

          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
            To: <strong style={{ color: '#111827' }}>{email.senderEmail}</strong>
            &nbsp;&nbsp;Subject: <strong style={{ color: '#111827' }}>Re: {email.subject}</strong>
          </div>

          <textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            rows={8}
            placeholder="Write your reply here…"
            style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 13, lineHeight: 1.65, color: '#111827', resize: 'vertical', fontFamily: 'inherit', background: '#fff', outline: 'none' }}
          />

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              onClick={() => { setShowReplyBox(false); setReplyText('') }}
              style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', fontSize: 13, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={() => sendMutation.mutate()}
              disabled={isSending || !replyText.trim()}
              style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: isSending || !replyText.trim() ? '#a5b4fc' : '#6366f1', color: '#fff', fontWeight: 600, fontSize: 13, cursor: isSending || !replyText.trim() ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {isSending ? (
                <><span style={{ display: 'inline-block', animation: 'spin 0.7s linear infinite' }}>↺</span> Sending…</>
              ) : (
                <>Send via Gmail ↗</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
