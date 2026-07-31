import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import logo from '../assets/logo.jpg'

const API = import.meta.env.VITE_API_URL || '/api'

const STARTERS = [
  'How many days of annual leave do I get?',
  'What is the process for claiming medical expenses?',
  'What is the work-from-home policy?',
  'How do I apply for maternity/paternity leave?',
]

export default function ChatPage({ messages, setMessages }) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (question) => {
    const q = (question ?? input).trim()
    if (!q || loading) return

    setMessages(prev => [...prev, { role: 'user', text: q }])
    setInput('')
    setLoading(true)

    try {
      const res = await axios.post(`${API}/chat`, { question: q })
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: res.data.answer,
        sources: res.data.sources || [],
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Something went wrong. Please try again.',
        error: true,
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const isEmpty = messages.length === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{
        padding: '1.1rem 1.75rem',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <h1 style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Ask HR</h1>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '1px' }}>
            Answers drawn from your company's HR documents
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            style={{
              border: '1px solid var(--border)',
              background: 'transparent',
              borderRadius: 6,
              padding: '0.35rem 0.75rem',
              fontSize: '0.78rem',
              color: 'var(--muted)',
              cursor: 'pointer',
            }}
          >
            Clear chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1.5rem 1.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        {isEmpty && <EmptyState onSelect={send} />}

        {messages.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}

        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '1rem 1.75rem 1.25rem',
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex',
          gap: '0.6rem',
          background: 'var(--bg)',
          border: '1.5px solid var(--border)',
          borderRadius: 10,
          padding: '0.5rem 0.5rem 0.5rem 1rem',
          transition: 'border-color 0.15s',
        }}
          onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--amber)'}
          onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            disabled={loading}
            placeholder="Ask anything about company HR policies…"
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '0.9rem',
              color: 'var(--text)',
              lineHeight: 1.5,
            }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            style={{
              background: input.trim() && !loading ? 'var(--amber)' : 'var(--border)',
              color: input.trim() && !loading ? 'var(--navy)' : 'var(--muted)',
              border: 'none',
              borderRadius: 7,
              padding: '0.5rem 1.1rem',
              fontWeight: 600,
              fontSize: '0.85rem',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
          >
            Send
          </button>
        </div>
        <p style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.5rem', textAlign: 'center' }}>
          Responses are limited to information in your HR documents.
        </p>
      </div>
    </div>
  )
}

function formatAnswer(text) {
  const lines = text.split('\n').filter(line => line.trim() !== '')
  return lines.map((line, i) => (
    <p key={i} style={{ margin: i === 0 ? 0 : '0.6rem 0 0' }}>
      {formatBold(line)}
    </p>
  ))
}

function formatBold(line) {
  const parts = line.split(/(\*\*.+?\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      animation: 'fadeUp 0.2s ease',
    }}>
      <div style={{ maxWidth: '72%' }}>
        {!isUser && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            marginBottom: '0.35rem',
          }}>
            <img src={logo} alt="" style={{
              width: 20, height: 20,
              borderRadius: '50%',
              objectFit: 'contain',
            }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              HR Assistant
            </span>
          </div>
        )}
        <div style={{
          padding: '0.7rem 1rem',
          borderRadius: isUser ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
          background: isUser ? 'var(--amber)' : 'var(--surface)',
          color: isUser ? 'var(--navy)' : 'var(--text)',
          border: isUser ? 'none' : '1px solid var(--border)',
          fontSize: '0.9rem',
          lineHeight: 1.6,
          fontWeight: isUser ? 500 : 400,
          boxShadow: isUser ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          {isUser ? msg.text : formatAnswer(msg.text)}
        </div>

        {/* Source badges */}
        {msg.sources?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.5rem' }}>
            {msg.sources.map((src, i) => (
              <span key={i} style={{
                fontFamily: 'var(--mono)',
                fontSize: '0.68rem',
                background: 'var(--amber-light)',
                color: 'var(--amber-dark)',
                border: '1px solid #f0d8a0',
                padding: '0.15rem 0.5rem',
                borderRadius: 4,
                letterSpacing: '0.02em',
              }}>
                ↗ {src}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', animation: 'fadeUp 0.2s ease' }}>
      <img src={logo} alt="" style={{
        width: 20, height: 20,
        borderRadius: '50%',
        objectFit: 'contain',
        flexShrink: 0,
      }} />
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '4px 16px 16px 16px',
        padding: '0.7rem 1rem',
        display: 'flex', gap: '4px', alignItems: 'center',
      }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 6, height: 6,
            borderRadius: '50%',
            background: 'var(--navy)',
            display: 'block',
            animation: `blink 1.2s ease ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  )
}

function EmptyState({ onSelect }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 0' }}>
      <img src={logo} alt="" style={{ width: 56, height: 56, marginBottom: '0.75rem', objectFit: 'contain' }} />
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.35rem' }}>
        What can I help you with?
      </h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1.75rem', textAlign: 'center' }}>
        I'll answer from your company's HR documents only.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', maxWidth: 440 }}>
        {STARTERS.map((s, i) => (
          <button
            key={i}
            onClick={() => onSelect(s)}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '0.65rem 1rem',
              fontSize: '0.85rem',
              color: 'var(--text)',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'border-color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => { e.target.style.borderColor = 'var(--amber)'; e.target.style.background = 'var(--amber-light)' }}
            onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'var(--surface)' }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
