import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import { emailApi } from '@/api'
import { useEmailStore } from '@/store/emailStore'
import type { GmailEmail, EmailFilter } from '@/types'

const FILTERS: { key: EmailFilter; label: string }[] = [
  { key: 'inbox',   label: 'Inbox'   },
  { key: 'unread',  label: 'Unread'  },
  { key: 'starred', label: 'Starred' },
  { key: 'sent',    label: 'Sent'    },
]

function getLabelStyle(labelIds: string[]) {
  if (labelIds.includes('CATEGORY_PROMOTIONS')) return { bg: '#fef3c7', color: '#92400e', name: 'Promos'    }
  if (labelIds.includes('CATEGORY_SOCIAL'))     return { bg: '#dbeafe', color: '#1e40af', name: 'Social'    }
  if (labelIds.includes('IMPORTANT'))           return { bg: '#fce7f3', color: '#9d174d', name: 'Important' }
  return null
}

export default function EmailList() {
  const qc = useQueryClient()
  const { filter, setFilter, setSelectedEmail, selectedEmail, searchQuery } = useEmailStore()
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ['emails', filter, page, searchQuery],
    queryFn: () => searchQuery ? emailApi.search(searchQuery, page) : emailApi.list(filter, page),
    placeholderData: (prev) => prev,
  })

  const { data: unreadCount } = useQuery({
    queryKey: ['unreadCount'],
    queryFn: emailApi.unreadCount,
    refetchInterval: 30_000,
  })

  const syncMutation = useMutation({
    mutationFn: emailApi.sync,
    onSuccess: (res) => {
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: ['emails'] })
      qc.invalidateQueries({ queryKey: ['unreadCount'] })
    },
    onError: () => toast.error('Sync failed — check Gmail connection'),
  })

  const starMutation = useMutation({
    mutationFn: ({ id, starred }: { id: string; starred: boolean }) => emailApi.star(id, starred),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['emails'] }),
  })

  const emails     = data?.content ?? []
  const totalPages = data?.totalPages ?? 1

  return (
    <div style={{ width: 288, borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', background: '#fff', flexShrink: 0 }}>

      <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>
            {FILTERS.find(f => f.key === filter)?.label ?? 'Results'}
          </span>
          {!!unreadCount && (
            <span style={{ background: '#ef4444', color: '#fff', borderRadius: 99, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>
              {unreadCount}
            </span>
          )}
        </div>
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', fontSize: 11, color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, opacity: syncMutation.isPending ? 0.6 : 1 }}
        >
          <span style={{ display: 'inline-block', animation: syncMutation.isPending ? 'spin 0.7s linear infinite' : 'none' }}>↺</span>
          {syncMutation.isPending ? 'Syncing…' : 'Sync Gmail'}
        </button>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', padding: '0 14px' }}>
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => { setFilter(f.key); setPage(0) }}
            style={{ padding: '7px 10px', border: 'none', background: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', color: filter === f.key ? '#6366f1' : '#6b7280', borderBottom: filter === f.key ? '2px solid #6366f1' : '2px solid transparent' }}
          >{f.label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isLoading
          ? Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} />)
          : emails.length === 0
            ? <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>{searchQuery ? `No results for "${searchQuery}"` : 'No emails here'}</div>
            : emails.map(email => (
              <EmailRow
                key={email.id}
                email={email}
                selected={selectedEmail?.id === email.id}
                onSelect={() => setSelectedEmail(email)}
                onStar={(s) => starMutation.mutate({ id: email.id, starred: s })}
              />
            ))
        }
      </div>

      {totalPages > 1 && (
        <div style={{ padding: '8px 14px', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#6b7280' }}>
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, opacity: page === 0 ? 0.3 : 1 }}>‹</button>
          <span>{page + 1} / {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, opacity: page >= totalPages - 1 ? 0.3 : 1 }}>›</button>
        </div>
      )}
    </div>
  )
}

function EmailRow({ email, selected, onSelect, onStar }: { email: GmailEmail; selected: boolean; onSelect: () => void; onStar: (s: boolean) => void }) {
  const label   = getLabelStyle(email.labelIds)
  const timeAgo = formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true })
    .replace('about ', '').replace('less than a minute ago', 'just now')

  return (
    <div onClick={onSelect} style={{ padding: '10px 14px 9px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', borderLeft: selected ? '3px solid #6366f1' : '3px solid transparent', background: selected ? 'rgba(99,102,241,0.06)' : email.read ? '#fff' : '#fafaff', position: 'relative' }}>
      {!email.read && <div style={{ position: 'absolute', top: 13, right: 13, width: 7, height: 7, borderRadius: '50%', background: '#6366f1' }} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <span style={{ fontWeight: email.read ? 400 : 600, fontSize: 12.5, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 168 }}>
          {email.senderName || email.senderEmail}
        </span>
        <span style={{ fontSize: 10, color: '#9ca3af', flexShrink: 0, marginLeft: 4 }}>{timeAgo}</span>
      </div>

      <div style={{ fontSize: 12, color: email.read ? '#4b5563' : '#1f2937', fontWeight: email.read ? 400 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
        {email.subject || '(no subject)'}
      </div>

      <div style={{ fontSize: 11, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {email.snippet || ''}
      </div>

      <div style={{ display: 'flex', gap: 5, marginTop: 5, alignItems: 'center' }}>
        {label && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 500, background: label.bg, color: label.color }}>{label.name}</span>}
        {email.hasAttachments && <span style={{ fontSize: 11, color: '#9ca3af' }}>📎</span>}
        <button onClick={e => { e.stopPropagation(); onStar(!email.starred) }} style={{ marginLeft: 'auto', border: 'none', background: 'none', fontSize: 14, cursor: 'pointer', color: email.starred ? '#f59e0b' : '#d1d5db', padding: 0, lineHeight: 1 }}>
          {email.starred ? '★' : '☆'}
        </button>
      </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6' }}>
      <div className="skeleton" style={{ height: 11, width: '55%', marginBottom: 6 }} />
      <div className="skeleton" style={{ height: 10, width: '85%', marginBottom: 5 }} />
      <div className="skeleton" style={{ height: 10, width: '65%' }} />
    </div>
  )
}
