import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import {
  createTask,
  deleteTask,
  getCurrentUser,
  getTasks,
  loginUser,
  readToken,
  registerUser,
  saveToken,
  updateTask,
} from './api'
import './App.css'

const Projects = lazy(() => import('./pages/Projects.jsx'))
const Contact = lazy(() => import('./pages/Contact.jsx'))

const sampleTasks = [
  { _id: 'sample-1', title: 'Map the next release', description: 'Turn customer notes into a tight release brief.', status: 'in-progress', priority: 'high', dueDate: '2026-08-26' },
  { _id: 'sample-2', title: 'Review onboarding flow', description: 'Walk through the first-run experience on mobile.', status: 'todo', priority: 'medium', dueDate: '2026-08-29' },
  { _id: 'sample-3', title: 'Archive old experiments', description: 'Close out finished branches and tidy the workspace.', status: 'done', priority: 'low', dueDate: '2026-08-21' },
]

const emptyForm = { title: '', description: '', priority: 'medium', dueDate: '' }
const emptyAuth = { email: '', password: '' }

function App() {
  const [path, setPath] = useState(window.location.pathname)
  const [token, setToken] = useState(readToken())
  const [user, setUser] = useState(null)
  const [tasks, setTasks] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [authForm, setAuthForm] = useState(emptyAuth)
  const [authMode, setAuthMode] = useState('login')
  const [authError, setAuthError] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(Boolean(readToken()))
  const [usingSamples, setUsingSamples] = useState(false)

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = (event, nextPath) => {
    event.preventDefault()
    window.history.pushState({}, '', nextPath)
    setPath(nextPath)
  }

  const handleLogout = () => {
    saveToken(null)
    setToken(null)
    setUser(null)
    setTasks([])
    setUsingSamples(false)
  }

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setUser(null)
      setTasks([])
      return
    }

    let cancelled = false

    const loadSession = async () => {
      try {
        const currentUser = await getCurrentUser()
        if (!cancelled) setUser(currentUser)
      } catch {
        if (!cancelled) handleLogout()
        return
      }

      try {
        const fetchedTasks = await getTasks()
        if (!cancelled) {
          setTasks(fetchedTasks)
          setUsingSamples(false)
        }
      } catch {
        if (!cancelled) {
          setTasks(sampleTasks)
          setUsingSamples(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadSession()
    return () => {
      cancelled = true
    }
  }, [token])

  const counts = useMemo(() => ({ all: tasks.length, todo: tasks.filter((task) => task.status === 'todo').length, 'in-progress': tasks.filter((task) => task.status === 'in-progress').length, done: tasks.filter((task) => task.status === 'done').length }), [tasks])
  const visibleTasks = filter === 'all' ? tasks : tasks.filter((task) => task.status === filter)

  const handleAuthSubmit = async (event) => {
    event.preventDefault()
    setAuthError('')

    try {
      if (authMode === 'register') {
        await registerUser(authForm.email.trim(), authForm.password)
        setAuthMode('login')
        setAuthForm({ ...emptyAuth })
        setAuthError('Registration successful. Please sign in.')
        return
      }

      const payload = await loginUser(authForm.email.trim(), authForm.password)
      saveToken(payload.token)
      setToken(payload.token)
      setUser(payload.user)
      setAuthForm(emptyAuth)
    } catch (error) {
      setAuthError(error.message)
    }
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    if (!form.title.trim()) return
    const draft = { ...form, title: form.title.trim(), status: 'todo' }
    if (usingSamples) {
      setTasks((current) => [{ ...draft, _id: `sample-${Date.now()}` }, ...current])
    } else {
      const created = await createTask(draft)
      setTasks((current) => [created, ...current])
    }
    setForm(emptyForm)
  }

  const moveTask = async (task, status) => {
    if (usingSamples) {
      setTasks((current) => current.map((item) => item._id === task._id ? { ...item, status } : item))
      return
    }

    try {
      const updatedTask = await updateTask(task._id, { status })
      setTasks((current) => current.map((item) => item._id === task._id ? updatedTask : item))
    } catch (error) {
      window.alert(error.message)
    }
  }

  const removeTask = async (task) => {
    if (usingSamples) {
      setTasks((current) => current.filter((item) => item._id !== task._id))
      return
    }

    try {
      await deleteTask(task._id)
      setTasks((current) => current.filter((item) => item._id !== task._id))
    } catch (error) {
      window.alert(error.message)
    }
  }

  if (!token) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="auth-header">
            <div className="brand"><span className="brand-mark">P7</span><span>taskflow<span className="brand-accent">.</span></span></div>
            <div className="auth-toggle">
              <button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')} type="button">Login</button>
              <button className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')} type="button">Register</button>
            </div>
          </div>
          <h1>{authMode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
          <p className="auth-copy">{authMode === 'login' ? 'Use your email and password to access your task board.' : 'Register to start managing tasks securely.'}</p>
          <form onSubmit={handleAuthSubmit} className="auth-form">
            <label>
              Email
              <input type="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} placeholder="name@example.com" required />
            </label>
            <label>
              Password
              <input type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} placeholder="At least 6 characters" minLength="6" required />
            </label>
            {authError && <p className="auth-error">{authError}</p>}
            <button type="submit" className="submit-button auth-submit">{authMode === 'login' ? 'Sign in' : 'Create account'}</button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">P7</span><span>taskflow<span className="brand-accent">.</span></span></div>
        <div className="workspace-switcher"><span className="workspace-dot" />Workspace / {user?.email ? user.email.split('@')[0] : 'team'} <span className="chevron">⌄</span></div>
        <div className="top-actions">
          <button className="icon-button" aria-label="Search">⌕</button>
          <nav className="route-nav" aria-label="Main navigation">
            <a className={path === '/' ? 'active' : ''} href="/" onClick={(event) => navigate(event, '/')}>Tasks</a>
            <a className={path === '/projects' ? 'active' : ''} href="/projects" onClick={(event) => navigate(event, '/projects')}>Projects</a>
            <a className={path === '/contact' ? 'active' : ''} href="/contact" onClick={(event) => navigate(event, '/contact')}>Contact</a>
          </nav>
          <div className="user-chip">{user?.email ? user.email[0].toUpperCase() : 'U'}</div>
          <button className="logout-button" onClick={handleLogout} type="button">Logout</button>
        </div>
      </header>
      <section className="hero">
        <div>
          <p className="eyebrow">MONDAY, AUGUST 24, 2026</p>
          <h1>Good morning, {user?.email ? user.email.split('@')[0] : 'there'}<span className="headline-dot">.</span></h1>
          <p className="hero-copy">A clear desk makes room for good work. Here is what is moving today.</p>
        </div>
        <div className="progress-card">
          <div className="progress-label"><span>Weekly momentum</span><strong>{counts.done} of {counts.all || 0} complete</strong></div>
          <div className="progress-track"><span style={{ width: `${counts.all ? (counts.done / counts.all) * 100 : 0}%` }} /></div>
          <small>Keep the streak alive</small>
        </div>
      </section>
      {path === '/projects' ? (
        <Suspense fallback={<div className="route-loading" role="status">Loading projects...</div>}>
          <Projects />
        </Suspense>
      ) : path === '/contact' ? (
        <Suspense fallback={<div className="route-loading" role="status">Loading contact...</div>}>
          <Contact />
        </Suspense>
      ) : <section className="content-grid">
        <div className="tasks-panel">
          <div className="section-heading">
            <div><p className="eyebrow">YOUR WORKSPACE</p><h2>Task board</h2></div>
            <span className="task-total">{counts.all} total</span>
          </div>
          <nav className="filters" aria-label="Task filters">{[['all', 'All tasks'], ['todo', 'To do'], ['in-progress', 'In progress'], ['done', 'Complete']].map(([key, label]) => <button key={key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>{label}<span>{counts[key]}</span></button>)}</nav>
          {usingSamples && <div className="offline-note">Showing sample tasks. Start the API and connect MongoDB to persist changes.</div>}
          <div className="task-list">
            {loading ? <p className="empty-state">Loading your tasks...</p> : visibleTasks.length ? visibleTasks.map((task) => (
              <article className={`task-row ${task.status}`} key={task._id}>
                <button className="check-button" aria-label={`Mark ${task.title} complete`} onClick={() => moveTask(task, task.status === 'done' ? 'todo' : 'done')}>{task.status === 'done' ? '✓' : ''}</button>
                <div className="task-body">
                  <div className="task-title-line"><h3>{task.title}</h3><span className={`priority ${task.priority}`}>{task.priority}</span></div>
                  {task.description && <p>{task.description}</p>}
                  <div className="task-meta"><span className="status-label">{task.status.replace('-', ' ')}</span>{task.dueDate && <span>Due {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}</div>
                </div>
                <div className="row-actions"><button onClick={() => moveTask(task, task.status === 'in-progress' ? 'todo' : 'in-progress')} aria-label="Move task">↗</button><button onClick={() => removeTask(task)} aria-label="Delete task">×</button></div>
              </article>
            )) : <p className="empty-state">Nothing here yet. Add a task to get moving.</p>}
          </div>
        </div>
        <aside className="add-panel">
          <p className="eyebrow">MAKE IT REAL</p>
          <h2>Add a task</h2>
          <p className="panel-copy">Capture the next thing while it is still clear in your head.</p>
          <form onSubmit={handleCreate}>
            <label>Task title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="What needs doing?" /></label>
            <label>Details<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Add useful context..." rows="3" /></label>
            <div className="form-row">
              <label>Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
              <label>Due date<input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></label>
            </div>
            <button className="submit-button" type="submit"><span>+</span> Add to board</button>
          </form>
        </aside>
      </section>}
      <footer><span>Practical 7 / Authentication & middleware</span><span>Designed for focus <b>•</b> Built for momentum</span></footer>
    </main>
  )
}

export default App
