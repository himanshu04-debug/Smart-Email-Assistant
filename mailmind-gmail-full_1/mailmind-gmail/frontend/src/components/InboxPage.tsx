import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useEmailStore } from '@/store/emailStore'
import EmailList from './EmailList'
import EmailDetail from './EmailDetail'
import AiPanel from './AiPanel'

const SIDEBAR_ITEMS = [
  { key: 'inbox',   label: 'Inbox',   icon: '📥' },
  { key: 'unread',  label: 'Unread',  icon: '🔵' },
  { key: 'starred', label: 'Starred', icon: '⭐' },
  { key: 'sent',    label: 'Sent',    icon: '📤' },
  { key: 'spam',    label: 'Spam',    icon: '🚫' },
]

export default function InboxPage() {
  const { user, logout }           = useAuthStore()
  const { filter, setFilter, setSearchQuery, searchQuery } = useEmailStore()
  const [searchInput, setSearchInput] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchQuery(searchInput.trim())
  }

  const clearSearch = () => {
    setSearchInput('')
    setSearchQuery('')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'column', background: '#f1f3f8' }}>

      {/* Top bar */}
      <div style={{ height: 52, background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, flexShrink: 0, zIndex: 10 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#111827', letterSpacing: '-0.3px' }}>MailMind AI</span>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} style={{ flex: 1, maxWidth: 480, position: 'relative' }}>
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search emails…"
            style={{ width: '100%', padding: '7px 36px 7px 32px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f9fafb', fontSize: 13, color: '#111827', outline: 'none' }}
          />
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 14 }}>🔍</span>
          {searchInput && (
            <button type="button" onClick={clearSearch}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
          )}
        </form>

        {/* Gmail badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 99, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ fontSize: 11, color: '#15803d', fontWeight: 500 }}>Gmail connected</span>
        </div>

        {/* User avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          {user?.picture ? (
            <img src={user.picture} alt={user.name} style={{ width: 30, height: 30, borderRadius: '50%', border: '2px solid #e5e7eb' }} />
          ) : (
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#6366f1' }}>
              {(user?.name || user?.email || 'U')[0].toUpperCase()}
            </div>
          )}
          <div style={{ display: 'none' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{user?.name}</div>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{user?.email}</div>
          </div>
          <button
            onClick={logout}
            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', fontSize: 11, color: '#6b7280', cursor: 'pointer' }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Sidebar */}
        <div style={{ width: 188, background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', flexShrink: 0, padding: '12px 0' }}>
          <div style={{ padding: '0 12px', marginBottom: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Mailbox</div>
          </div>
          {SIDEBAR_ITEMS.map(item => (
            <button
              key={item.key}
              onClick={() => { setFilter(item.key as any); clearSearch() }}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '7px 12px', border: 'none', background: 'none',
                cursor: 'pointer', width: '100%', textAlign: 'left',
                fontSize: 13, fontWeight: filter === item.key ? 500 : 400,
                color: filter === item.key ? '#6366f1' : '#4b5563',
                borderLeft: filter === item.key ? '3px solid #6366f1' : '3px solid transparent',
                background: filter === item.key ? 'rgba(99,102,241,0.06)' : 'transparent',
              }}
            >
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}

          <div style={{ padding: '12px 12px 4px', marginTop: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>About</div>
          </div>
          <div style={{ padding: '0 12px' }}>
            <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.7 }}>
              <div>✦ Spring Boot 3.4</div>
              <div>✦ Spring AI + GPT-4o</div>
              <div>✦ Gmail OAuth2 API</div>
              <div>✦ pgvector RAG</div>
              <div>✦ React 18 + Zustand</div>
            </div>
          </div>

          <div style={{ marginTop: 'auto', padding: '12px', borderTop: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                AI engine online
              </div>
              <div style={{ color: '#d1d5db' }}>Syncs every 60s</div>
            </div>
          </div>
        </div>

        {/* Email list + detail + AI panel */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minWidth: 0 }}>
          <EmailList />
          <EmailDetail />
          <AiPanel />
        </div>
      </div>
    </div>
  )
}
