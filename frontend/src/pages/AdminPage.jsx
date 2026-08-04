import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || '/api'

const ACCEPTED = '.pdf,.docx,.doc,.txt'
const ALLOWED = ['pdf', 'docx', 'doc', 'txt']
const STORAGE_KEY = 'corpmind_admin_key'

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem(STORAGE_KEY) || '')
  const [files, setFiles] = useState([])
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const inputRef = useRef(null)

  const authHeaders = { 'X-Admin-Key': adminKey }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setAdminKey('')
  }

  const fetchDocs = async () => {
    try {
      const res = await axios.get(`${API}/documents`, { headers: authHeaders })
      setDocuments(res.data.documents || [])
    } catch (err) {
      if (err.response?.status === 401) logout()
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (adminKey) fetchDocs() }, [adminKey])

  if (!adminKey) {
    return <AdminLogin onLogin={key => { localStorage.setItem(STORAGE_KEY, key); setAdminKey(key) }} />
  }

  const pickFiles = (fileList) => {
    const picked = Array.from(fileList || [])
    if (picked.length === 0) return
    const valid = []
    for (const f of picked) {
      const ext = f.name.split('.').pop().toLowerCase()
      if (!ALLOWED.includes(ext)) {
        showToast(`".${ext}" files aren't supported. Use PDF, DOCX, or TXT.`, 'error')
        continue
      }
      valid.push(f)
    }
    if (valid.length > 0) setFiles(prev => [...prev, ...valid])
  }

  const removeFile = (i) => setFiles(prev => prev.filter((_, idx) => idx !== i))

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    pickFiles(e.dataTransfer.files)
  }

  const upload = async () => {
    if (files.length === 0 || uploading) return
    setUploading(true)
    let successCount = 0
    let firstError = null
    for (const f of files) {
      const form = new FormData()
      form.append('file', f)
      try {
        await axios.post(`${API}/upload`, form, { headers: authHeaders })
        successCount++
      } catch (err) {
        if (err.response?.status === 401) { logout(); return }
        firstError = err.response?.data?.detail || `Failed to upload "${f.name}".`
      }
    }
    if (successCount > 0) {
      showToast(`${successCount} document${successCount !== 1 ? 's' : ''} uploaded and indexed.`)
    }
    if (firstError) {
      showToast(firstError, 'error')
    }
    setFiles([])
    fetchDocs()
    setUploading(false)
  }

  const remove = async (filename) => {
    if (!confirm(`Remove "${filename}" from the knowledge base?`)) return
    try {
      await axios.delete(`${API}/documents/${encodeURIComponent(filename)}`, { headers: authHeaders })
      showToast(`"${filename}" removed.`)
      fetchDocs()
    } catch (err) {
      if (err.response?.status === 401) logout()
      showToast(err.response?.data?.detail || 'Remove failed.', 'error')
    }
  }

  const extColor = (filename) => {
    const ext = filename.split('.').pop().toLowerCase()
    const map = { pdf: '#DC2626', docx: '#2563EB', doc: '#2563EB', txt: '#6B7280' }
    return map[ext] || '#6B7280'
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: 'var(--bg)' }}>
      {/* Header */}
      <div className="page-header" style={{
        padding: '1.1rem 1.75rem',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Documents</h1>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '1px' }}>
            Manage the HR documents employees can ask questions about
          </p>
        </div>
        <button
          onClick={logout}
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
          Log out
        </button>
      </div>

      <div className="admin-body" style={{ padding: '1.5rem 1.75rem', maxWidth: 680 }}>
        {/* Toast */}
        {toast && (
          <div style={{
            padding: '0.7rem 1rem',
            borderRadius: 8,
            marginBottom: '1rem',
            fontSize: '0.85rem',
            fontWeight: 500,
            background: toast.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
            color: toast.type === 'success' ? 'var(--success)' : 'var(--danger)',
            border: `1px solid ${toast.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            animation: 'fadeUp 0.2s ease',
          }}>
            {toast.type === 'success' ? '✓ ' : '✕ '}{toast.msg}
          </div>
        )}

        {/* Upload card */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '1.5rem',
          marginBottom: '1.25rem',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--navy)' }}>
            Add document
          </h2>

          {/* Drop zone */}
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            style={{
              border: `2px dashed ${dragging ? 'var(--amber)' : 'var(--border)'}`,
              borderRadius: 10,
              padding: '2rem 1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragging ? 'var(--amber-light)' : 'var(--bg)',
              transition: 'all 0.15s ease',
              marginBottom: '0.85rem',
            }}
          >
            <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>📂</div>
            <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)', marginBottom: '0.25rem' }}>
              Drop files here or click to browse
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>PDF, DOCX, TXT — select multiple at once</p>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              multiple
              onChange={e => { pickFiles(e.target.files); e.target.value = '' }}
              style={{ display: 'none' }}
            />
          </div>

          {/* Selected files */}
          {files.length > 0 ? (
            <div style={{ marginBottom: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {files.map((f, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 1rem',
                  background: 'var(--amber-light)',
                  border: '1px solid #f0d8a0',
                  borderRadius: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <FileIcon filename={f.name} />
                    <div>
                      <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--navy)' }}>{f.name}</p>
                      <p style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{(f.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(i)}
                    style={{
                      background: 'transparent', border: 'none',
                      color: 'var(--muted)', fontSize: '1rem', cursor: 'pointer', padding: '0 0.25rem',
                    }}
                  >×</button>
                </div>
              ))}
            </div>
          ) : null}

          <button
            onClick={upload}
            disabled={files.length === 0 || uploading}
            style={{
              background: files.length > 0 && !uploading ? 'var(--navy)' : 'var(--border)',
              color: files.length > 0 && !uploading ? '#fff' : 'var(--muted)',
              border: 'none',
              borderRadius: 8,
              padding: '0.65rem 1.4rem',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: files.length > 0 && !uploading ? 'pointer' : 'default',
              transition: 'all 0.15s',
            }}
          >
            {uploading ? 'Indexing…' : `Upload & Index${files.length > 1 ? ` (${files.length})` : ''}`}
          </button>
        </div>

        {/* Documents list */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <div style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--navy)' }}>
              Knowledge base
            </h2>
            <span style={{
              fontFamily: 'var(--mono)',
              fontSize: '0.72rem',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: '0.15rem 0.6rem',
              color: 'var(--muted)',
            }}>
              {documents.length} doc{documents.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.875rem' }}>
              Loading…
            </div>
          ) : documents.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center' }}>
              <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📭</p>
              <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)', marginBottom: '0.25rem' }}>
                No documents yet
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                Upload your first HR document above to get started.
              </p>
            </div>
          ) : (
            <div>
              {documents.map((doc, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1.25rem',
                    borderBottom: i < documents.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <FileIcon filename={doc} />
                    <span style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '0.8rem',
                      color: 'var(--text)',
                      fontWeight: 500,
                    }}>{doc}</span>
                  </div>
                  <button
                    onClick={() => remove(doc)}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      padding: '0.3rem 0.75rem',
                      fontSize: '0.75rem',
                      color: 'var(--muted)',
                      cursor: 'pointer',
                      fontWeight: 500,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.target.style.background = 'var(--danger-bg)'; e.target.style.color = 'var(--danger)'; e.target.style.borderColor = '#fecaca' }}
                    onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = 'var(--muted)'; e.target.style.borderColor = 'var(--border)' }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!password || checking) return
    setChecking(true)
    setError('')
    try {
      await axios.post(`${API}/admin/login`, { password })
      onLogin(password)
    } catch {
      setError('Incorrect password.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <form onSubmit={submit} style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '2rem',
        width: 320,
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.25rem' }}>
          Admin login
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '1.25rem' }}>
          Enter the admin password to manage HR documents.
        </p>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          style={{
            width: '100%',
            border: '1.5px solid var(--border)',
            borderRadius: 8,
            padding: '0.55rem 0.75rem',
            fontSize: '0.875rem',
            marginBottom: '0.75rem',
            boxSizing: 'border-box',
          }}
        />
        {error && (
          <p style={{ color: 'var(--danger)', fontSize: '0.78rem', marginBottom: '0.75rem' }}>{error}</p>
        )}
        <button
          type="submit"
          disabled={!password || checking}
          style={{
            width: '100%',
            background: password && !checking ? 'var(--navy)' : 'var(--border)',
            color: password && !checking ? '#fff' : 'var(--muted)',
            border: 'none',
            borderRadius: 8,
            padding: '0.65rem 1rem',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: password && !checking ? 'pointer' : 'default',
          }}
        >
          {checking ? 'Checking…' : 'Log in'}
        </button>
      </form>
    </div>
  )
}

function FileIcon({ filename }) {
  const ext = filename.split('.').pop().toLowerCase()
  const colors = { pdf: '#DC2626', docx: '#2563EB', doc: '#2563EB', txt: '#6B7280' }
  const color = colors[ext] || '#6B7280'
  return (
    <div style={{
      width: 30, height: 30,
      background: `${color}15`,
      border: `1px solid ${color}30`,
      borderRadius: 6,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      <span style={{
        fontFamily: 'var(--mono)',
        fontSize: '0.55rem',
        fontWeight: 700,
        color,
        textTransform: 'uppercase',
        letterSpacing: '0.02em',
      }}>
        {ext}
      </span>
    </div>
  )
}
