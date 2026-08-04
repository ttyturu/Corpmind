import { useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import ChatPage from './pages/ChatPage'
import AdminPage from './pages/AdminPage'
import logo from './assets/logo.jpg'

export default function App() {
  const [messages, setMessages] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <BrowserRouter>
      <div className="app-shell" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        {/* Mobile top bar */}
        <div className="mobile-topbar">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '1.3rem',
              lineHeight: 1,
              padding: '0.25rem 0.4rem',
            }}
          >☰</button>
          <img src={logo} alt="CorpMind logo" style={{ width: 24, height: 24, objectFit: 'contain' }} />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>CorpMind</span>
        </div>

        {/* Overlay backdrop (mobile only) */}
        <div
          className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* Sidebar */}
        <aside className={`sidebar${sidebarOpen ? ' open' : ''}`} style={{
          width: 'var(--sidebar-w)',
          background: 'var(--navy)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          padding: '0',
        }}>
          {/* Logo */}
          <div style={{
            padding: '1.5rem 1.25rem 1rem',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
            }}>
              <img src={logo} alt="CorpMind logo" style={{
                width: 32, height: 32,
                objectFit: 'contain',
              }} />
              <span style={{
                color: '#fff',
                fontWeight: 700,
                fontSize: '1.05rem',
                letterSpacing: '-0.01em',
              }}>CorpMind</span>
            </div>
            <p style={{
              color: 'var(--navy-muted)',
              fontSize: '0.72rem',
              marginTop: '0.4rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              fontWeight: 500,
            }}>HR Knowledge Base</p>
          </div>

          {/* Nav */}
          <nav style={{ padding: '1rem 0.75rem', flex: 1 }}>
            <p style={{
              color: 'var(--navy-muted)',
              fontSize: '0.65rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 600,
              padding: '0 0.5rem',
              marginBottom: '0.5rem',
            }}>Navigation</p>
            <SidebarLink to="/" icon="💬" label="Ask HR" end onClick={() => setSidebarOpen(false)} />
            <SidebarLink to="/admin" icon="🗂️" label="Documents" onClick={() => setSidebarOpen(false)} />
          </nav>

          {/* Footer */}
          <div style={{
            padding: '1rem 1.25rem',
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}>
            <p style={{ color: 'var(--navy-muted)', fontSize: '0.72rem' }}>
              Answers sourced from<br />uploaded HR documents only.
            </p>
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route path="/" element={<ChatPage messages={messages} setMessages={setMessages} />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

function SidebarLink({ to, icon, label, end, onClick }) {
  return (
    <NavLink to={to} end={end} onClick={onClick} style={({ isActive }) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '0.65rem',
      padding: '0.55rem 0.75rem',
      borderRadius: 8,
      textDecoration: 'none',
      fontSize: '0.875rem',
      fontWeight: isActive ? 600 : 400,
      color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
      background: isActive ? 'rgba(233,168,76,0.18)' : 'transparent',
      borderLeft: isActive ? '3px solid var(--amber)' : '3px solid transparent',
      marginBottom: '0.25rem',
      transition: 'all 0.15s ease',
    })}>
      <span>{icon}</span>
      <span>{label}</span>
    </NavLink>
  )
}
