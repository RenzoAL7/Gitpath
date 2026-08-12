import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { IconType } from 'react-icons'
import { FaApple, FaLinux, FaWindows } from 'react-icons/fa'
import { FiArrowLeft, FiArrowRight, FiBookOpen, FiCheck, FiCode, FiGitBranch, FiGitCommit, FiLayers, FiLogOut, FiPlay, FiRefreshCw, FiShield, FiStar, FiTerminal, FiUser } from 'react-icons/fi'
import { GraphBoard } from './components/GraphBoard'
import { challenges, challengeWorlds, type Challenge } from './data/challenges'
import { courseChapters, courseSlides, type VisualKind } from './data/course'
import { createChallengeSession, runChallengeCommand, type ChallengeState } from './lib/challenge-simulator'
import { isSupabaseConfigured, supabase } from './lib/supabase'

const PRACTICE_PROGRESS_KEY = 'gitpath:completed-challenges:v1'
const COURSE_PROGRESS_KEY = 'gitpath:viewed-slides:v1'
const SETUP_PROGRESS_KEY = 'gitpath:setup-progress:v1'
const SETUP_STEP_IDS = ['git-install', 'git-verify', 'git-identity', 'desktop-install', 'desktop-login', 'desktop-clone'] as const
type SetupStepId = (typeof SETUP_STEP_IDS)[number]
type OperatingSystem = 'windows' | 'mac' | 'linux'

type IconName =
  | 'arrow'
  | 'arrowLeft'
  | 'book'
  | 'branch'
  | 'check'
  | 'code'
  | 'commit'
  | 'layers'
  | 'play'
  | 'refresh'
  | 'shield'
  | 'spark'
  | 'terminal'

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const icons: Record<IconName, IconType> = {
    arrow: FiArrowRight,
    arrowLeft: FiArrowLeft,
    book: FiBookOpen,
    branch: FiGitBranch,
    check: FiCheck,
    code: FiCode,
    commit: FiGitCommit,
    layers: FiLayers,
    play: FiPlay,
    refresh: FiRefreshCw,
    shield: FiShield,
    spark: FiStar,
    terminal: FiTerminal,
  }
  const Component = icons[name]
  return <Component aria-hidden="true" size={size} />
}

function PlatformIcon({ os }: { os: OperatingSystem }) {
  const icons: Record<OperatingSystem, IconType> = { windows: FaWindows, mac: FaApple, linux: FaLinux }
  const Component = icons[os]
  return <Component aria-hidden="true" className={`platform-icon platform-icon-${os}`} />
}

function Logo() {
  return (
    <span className="logo-lockup">
      <span className="logo-mark" aria-hidden="true"><i /><i /><i /></span>
      <span>gitpath<span>.</span></span>
    </span>
  )
}

function normalizePath(pathname: string) {
  return pathname.replace(/\/+$/, '') || '/'
}

function currentPath() {
  if (typeof window === 'undefined') return '/'
  return normalizePath(window.location.pathname)
}

function labHref(lessonId?: string) {
  return lessonId ? `/ejercicios?level=${encodeURIComponent(lessonId)}` : '/ejercicios'
}

function courseHref(slideId?: string) {
  return slideId ? `/aprender?slide=${encodeURIComponent(slideId)}` : '/aprender'
}

function readStoredList(key: string, allowed: Set<string>) {
  if (typeof window === 'undefined') return []
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? '[]')
    if (!Array.isArray(value)) return []
    return [...new Set(value.filter((item): item is string => typeof item === 'string' && allowed.has(item)))]
  } catch {
    return []
  }
}

function Navigation({ path, user, onOpenAuth, onSignOut }: { path: string; user: User | null; onOpenAuth: (mode: AuthMode) => void; onSignOut: () => void }) {
  const items = [
    { href: '/instalar', label: 'Instalar', match: ['/instalar'] },
    { href: '/github-desktop', label: 'GitHub Desktop', match: ['/github-desktop'] },
    { href: '/commits', label: 'Commits', match: ['/commits'] },
    { href: '/aprender', label: 'Entender Git', match: ['/aprender', '/fundamentos', '/ramas-y-prs'] },
    { href: '/ejercicios', label: 'Ejercicios', match: ['/ejercicios', '/laboratorio'] },
  ]

  return (
    <header className="topbar">
      <nav className="topbar-inner" aria-label="Navegación principal">
        <a className="brand" href="/" aria-label="Ir al inicio de GitPath"><Logo /></a>
        <div className="nav-links">
          {items.map((item) => {
            const active = item.match.some((route) => path === route || path.startsWith(`${route}/`))
            return <a aria-current={active ? 'page' : undefined} className={active ? 'active' : ''} href={item.href} key={item.href}>{item.label}</a>
          })}
        </div>
        <div className="nav-account">
          {user ? <><a className="account-chip" href="/progreso"><FiUser aria-hidden="true" /><span>{user.email}</span></a><button aria-label="Cerrar sesión" onClick={onSignOut} type="button"><FiLogOut aria-hidden="true" /></button></> : <><button className="login-button" onClick={() => onOpenAuth('login')} type="button">Iniciar sesión</button><button className="signup-button" onClick={() => onOpenAuth('signup')} type="button">Crear cuenta</button></>}
        </div>
      </nav>
    </header>
  )
}

function AppShell({ children, path, user, onOpenAuth, onSignOut, minimal = false }: { children: ReactNode; path: string; user: User | null; onOpenAuth: (mode: AuthMode) => void; onSignOut: () => void; minimal?: boolean }) {
  return (
    <main>
      <Navigation onOpenAuth={onOpenAuth} onSignOut={onSignOut} path={path} user={user} />
      {children}
      {!minimal && (
        <footer className="footer page-width">
          <a href="/"><Logo /></a>
          <p>De la instalación a tu primera rama, explicado como un mapa.</p>
          <div><a href="/instalar">Empezar</a><a href="/ejercicios">Practicar</a><a href="https://github.com/RenzoAL7/Gitpath" rel="noreferrer" target="_blank">Código ↗</a></div>
        </footer>
      )}
    </main>
  )
}

type AuthMode = 'login' | 'signup'

function readableAuthError(message: string) {
  const normalized = message.toLowerCase()
  if (normalized.includes('invalid login credentials')) return 'El correo o la contraseña no coinciden.'
  if (normalized.includes('email not confirmed')) return 'Confirma tu correo antes de iniciar sesión.'
  if (normalized.includes('user already registered')) return 'Ese correo ya tiene una cuenta. Inicia sesión.'
  if (normalized.includes('password should be')) return 'La contraseña debe tener al menos 6 caracteres.'
  if (normalized.includes('rate limit')) return 'Hubo demasiados intentos. Espera un momento y vuelve a probar.'
  return 'No pudimos completar la solicitud. Revisa los datos e inténtalo otra vez.'
}

function AuthDialog({ mode, onClose, onModeChange }: { mode: AuthMode; onClose: () => void; onModeChange: (mode: AuthMode) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  useEffect(() => setMessage(''), [mode])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setMessage('')
    if (!supabase) {
      setMessage('La autenticación no está configurada en este despliegue.')
      return
    }
    setPending(true)
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/` } })
    setPending(false)
    if (result.error) {
      setMessage(readableAuthError(result.error.message))
      return
    }
    if (mode === 'signup' && !result.data.session) {
      setMessage('Revisa tu correo y confirma la cuenta para continuar.')
      return
    }
    onClose()
  }

  return <div className="auth-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()} role="presentation">
    <section aria-labelledby="auth-title" aria-modal="true" className="auth-dialog" role="dialog">
      <button aria-label="Cerrar" className="auth-close" onClick={onClose} type="button">×</button>
      <Logo />
      <span className="eyebrow">TU CUENTA GITPATH</span>
      <h2 id="auth-title">{mode === 'login' ? 'Inicia sesión.' : 'Crea tu cuenta.'}</h2>
      <p>{mode === 'login' ? 'Accede con el correo que registraste.' : 'Regístrate con correo y contraseña.'}</p>
      <form onSubmit={submit}>
        <label>Correo<input autoComplete="email" autoFocus onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
        <label>Contraseña<input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={6} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>
        {message && <div aria-live="polite" className="auth-message">{message}</div>}
        <button className="button primary" disabled={pending || !isSupabaseConfigured} type="submit">{pending ? 'Procesando…' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</button>
      </form>
      <button className="auth-switch" onClick={() => onModeChange(mode === 'login' ? 'signup' : 'login')} type="button">{mode === 'login' ? '¿No tienes cuenta? Crear cuenta' : '¿Ya tienes cuenta? Iniciar sesión'}</button>
      <small>Autenticación protegida por Supabase.</small>
    </section>
  </div>
}

function CourseVisual({ kind, compact = false }: { kind: VisualKind; compact?: boolean }) {
  const wrapper = (content: ReactNode) => <div className={`course-visual visual-${kind}${compact ? ' compact' : ''}`} aria-hidden="true">{content}</div>

  if (kind === 'cover') return wrapper(
    <>
      <div className="cover-chaos">
        <span className="chaos-word word-head">HEAD??</span><span className="chaos-word word-conflict">CONFLICT!</span>
        {[0, 1, 2, 3, 4, 5].map((node) => <i className={`chaos-node chaos-node-${node}`} key={node} />)}
        {[0, 1, 2, 3, 4].map((line) => <b className={`chaos-line chaos-line-${line}`} key={line} />)}
      </div>
      <div className="cover-divider"><span>entender</span></div>
      <div className="cover-map">
        <span className="head-flag">HEAD</span>
        <div className="clean-track" />
        <i className="clean-node node-a"><small>a13</small></i><i className="clean-node node-b"><small>b72</small></i><i className="clean-node node-c"><small>c09</small></i>
        <span className="branch-flag">main</span>
      </div>
    </>,
  )

  if (kind === 'snapshot') return wrapper(
    <div className="snapshot-stack">
      <div className="snapshot-card snapshot-back"><span>parent</span><strong>4e2a1c</strong></div>
      <div className="snapshot-card snapshot-front">
        <header><span>commit</span><strong>7ac91f</strong></header>
        <div className="snapshot-image"><i /><i /><i /><b>proyecto / v3</b></div>
        <div className="snapshot-meta"><span>mensaje</span><strong>feat: agrega búsqueda</strong><span>apunta a</span><strong>4e2a1c</strong></div>
      </div>
      <span className="snapshot-stamp">INMUTABLE</span>
    </div>,
  )

  if (kind === 'graph') return wrapper(
    <div className="graph-scene">
      <span className="graph-label">los hijos conocen a sus padres</span>
      <div className="graph-line line-main" /><div className="graph-line line-branch" /><div className="graph-line line-merge" />
      <i className="graph-node g1"><small>a1</small></i><i className="graph-node g2"><small>b2</small></i><i className="graph-node g3"><small>c3</small></i>
      <i className="graph-node g4 accent-node"><small>d4</small></i><i className="graph-node g5 accent-node"><small>e5</small></i>
      <i className="graph-node g6 merge-node"><small>f6</small></i>
      <span className="parent-note note-one">parent</span><span className="parent-note note-two">2 parents</span>
    </div>,
  )

  if (kind === 'branch') return wrapper(
    <div className="branch-scene">
      <div className="branch-lane lane-main"><span>main</span><div /><i /><i /><i className="muted-node" /></div>
      <div className="branch-lane lane-feature"><span>feat/perfil</span><div /><i /><i className="active-node" /></div>
      <b className="fork-line" />
      <span className="pointer pointer-main">main → c3</span><span className="pointer pointer-feature">feat/perfil → e5</span>
      <p>una rama es solo <strong>nombre + hash</strong></p>
    </div>,
  )

  if (kind === 'head') return wrapper(
    <div className="head-scene">
      <div className="head-spotlight" />
      <span className="head-card">HEAD <b>→</b> feat/perfil</span>
      <div className="head-track" /><i className="head-node h1" /><i className="head-node h2" /><i className="head-node h3" />
      <span className="head-branch-label">feat/perfil</span>
      <div className="head-explain"><span>tú estás aquí</span><strong>e5a901</strong></div>
    </div>,
  )

  if (kind === 'staging') return wrapper(
    <div className="staging-scene">
      <div className="stage-column working"><header><span>01</span>working tree</header><i>perfil.ts</i><i>README.md</i><i>debug.log</i><small>todo lo que editaste</small></div>
      <span className="stage-arrow">add →</span>
      <div className="stage-column waiting"><header><span>02</span>staging</header><i>perfil.ts</i><small>solo lo que elegiste</small></div>
      <span className="stage-arrow second">commit →</span>
      <div className="stage-column saved"><header><span>03</span>commit</header><div className="mini-polaroid"><b>c09</b><i /><i /></div><small>la próxima foto</small></div>
    </div>,
  )

  if (kind === 'undo') return wrapper(
    <div className="undo-scene">
      <article><span>ARCHIVO</span><strong>restore</strong><div className="undo-file">perfil.ts <b>↶</b></div><p>recupera contenido</p></article>
      <article><span>PUNTERO</span><strong>reset</strong><div className="undo-track"><i /><i /><i /><b>HEAD</b></div><p>mueve una referencia</p></article>
      <article><span>HISTORIA</span><strong>revert</strong><div className="undo-track"><i /><i className="bad" /><i className="good" /></div><p>crea una compensación</p></article>
    </div>,
  )

  if (kind === 'rebase') return wrapper(
    <div className="rebase-scene">
      <div className="rebase-row before"><span>antes</span><div className="rebase-base" /><i>a1</i><i>b2</i><i className="feature">x3</i><i className="feature">y4</i></div>
      <b className="rebase-action">reproducir sobre la nueva base ↓</b>
      <div className="rebase-row after"><span>después</span><div className="rebase-base" /><i>a1</i><i>b2</i><i>c5</i><i className="feature new">x6′</i><i className="feature new">y7′</i></div>
      <p>mismo trabajo · <strong>hashes nuevos</strong></p>
    </div>,
  )

  return wrapper(
    <div className="reflog-scene">
      <div className="reflog-receipt"><header>movimientos de HEAD</header><p><span>HEAD@{'{0}'}</span><strong>reset → HEAD~1</strong></p><p className="found"><span>HEAD@{'{1}'}</span><strong>commit: búsqueda</strong></p><p><span>HEAD@{'{2}'}</span><strong>switch: main → feat</strong></p><footer>local · temporal · valioso</footer></div>
      <div className="rescue-line" /><i className="lost-commit">3a8ce1<small>encontrado</small></i>
      <span className="safety-tag">RED DE SEGURIDAD</span>
    </div>,
  )
}

function HomePage({ viewedSlides, completedChallenges, setupProgress }: { viewedSlides: string[]; completedChallenges: string[]; setupProgress: string[] }) {
  const hasProgress = viewedSlides.length + completedChallenges.length + setupProgress.length > 0
  const gitReady = SETUP_STEP_IDS.slice(0, 3).every((step) => setupProgress.includes(step))
  const desktopReady = SETUP_STEP_IDS.slice(3).every((step) => setupProgress.includes(step))
  const nextHref = !gitReady ? '/instalar' : !desktopReady ? '/github-desktop' : viewedSlides.length < courseSlides.length ? courseHref(courseSlides.find((slide) => !viewedSlides.includes(slide.id))?.id) : '/ejercicios'
  const previewState = createChallengeSession(challenges[1])

  const route = [
    { number: '01', href: '/instalar', title: 'Prepara tu equipo', text: 'Instala Git en Windows, macOS o Linux y comprueba que funciona.', icon: 'code' as IconName, meta: '5–10 min' },
    { number: '02', href: '/github-desktop', title: 'Conoce GitHub Desktop', text: 'Entiende repositorio, cambios, commit, push y pull con una interfaz visual.', icon: 'layers' as IconName, meta: '8 min' },
    { number: '03', href: '/aprender', title: 'Mira Git por dentro', text: 'Aprende commits, ramas, HEAD y staging como escenas, no como definiciones.', icon: 'book' as IconName, meta: `${courseSlides.length} escenas` },
    { number: '04', href: '/ejercicios', title: 'Mueve el grafo', text: 'Resuelve niveles básicos y observa cómo cambia la historia con cada comando.', icon: 'branch' as IconName, meta: `${challenges.length} niveles` },
  ]

  return (
    <>
      <section className="journey-hero page-width">
        <div className="journey-copy">
          <div className="eyebrow"><span>GIT DESDE CERO</span><i />SIN ASUMIR NADA</div>
          <h1>Tu camino para<br /><em>entender Git.</em></h1>
          <p>Empieza instalando las herramientas. Termina creando ramas, uniendo historias y entendiendo cada movimiento que haces.</p>
          <div className="hero-actions">
            <a className="button primary" href={nextHref}><Icon name="play" size={18} />{hasProgress ? 'Continuar mi ruta' : 'Empezar desde cero'}</a>
            <a className="button quiet" href="/ejercicios">Ver ejercicios <Icon name="arrow" size={18} /></a>
          </div>
          <div className="hero-proof"><span><Icon name="check" size={15} /> En español</span><span><Icon name="check" size={15} /> Cuenta opcional</span><span><Icon name="check" size={15} /> Progreso local</span></div>
        </div>
        <div className="journey-map" aria-label="Ruta de aprendizaje de Git">
          <div className="journey-map-head"><span>TU MAPA</span><small>DE CERO A TU PRIMER MERGE</small></div>
          <div className="journey-map-line" />
          {route.map((item, index) => <a className={`journey-stop stop-${index + 1}`} href={item.href} key={item.number}><span>{item.number}</span><div><small>{item.meta}</small><strong>{item.title}</strong></div></a>)}
          <div className="journey-map-status"><i /><span>Empieza aquí</span><strong>Instala Git</strong></div>
        </div>
      </section>

      <section className="route-section page-width">
        <div className="section-title"><div><span className="eyebrow">LA RUTA COMPLETA</span><h2>Primero prepara. Luego entiende. Al final, practica.</h2></div><p>No necesitas saber qué es una terminal ni haber creado un repositorio antes.</p></div>
        <div className="route-grid">
          {route.map((item, index) => (
            <a href={item.href} key={item.number}>
              <header><span>{item.number}</span><small>{item.meta}</small></header>
              <div className={`route-icon route-icon-${index}`}><Icon name={item.icon} size={25} /></div>
              <h3>{item.title}</h3><p>{item.text}</p><strong>Entrar <Icon name="arrow" size={16} /></strong>
            </a>
          ))}
        </div>
      </section>

      <section className="graph-teaser page-width">
        <div className="graph-teaser-copy"><span className="eyebrow">APRENDER HACIENDO</span><h2>No imagines qué hizo el comando. Míralo.</h2><p>El laboratorio dibuja commits, ramas y HEAD en tiempo real. Cada nivel tiene un objetivo corto, una pista y un reinicio seguro.</p><div><a className="button light" href="/ejercicios">Abrir los niveles <Icon name="arrow" size={18} /></a><span>{completedChallenges.length}/{challenges.length} resueltos</span></div></div>
        <div className="graph-teaser-board"><div className="graph-teaser-chrome"><i /><i /><i /><span>gitpath / nivel 02</span></div><GraphBoard compact state={previewState} /><code><b>$</b> git branch feature<span>▌</span></code></div>
      </section>
    </>
  )
}

const installationData: Record<OperatingSystem, { label: string; note: string; recommended: string; alternatives: { title: string; command: string; copy?: boolean; text: string }[] }> = {
  windows: {
    label: 'Windows',
    note: 'Windows 10 u 11 · x64 o ARM64',
    recommended: 'Instalador oficial de Git for Windows',
    alternatives: [
      { title: 'Opción recomendada', command: 'Descargar el instalador oficial', text: 'Ábrelo, conserva las opciones recomendadas y termina la instalación.' },
      { title: 'Con Windows Package Manager', command: 'winget install --id Git.Git -e --source winget', copy: true, text: 'Pega este comando en PowerShell si ya usas winget.' },
    ],
  },
  mac: {
    label: 'macOS',
    note: 'Apple silicon o Intel',
    recommended: 'Xcode Command Line Tools',
    alternatives: [
      { title: 'La forma más simple', command: 'xcode-select --install', copy: true, text: 'macOS abrirá una ventana. Confirma y espera a que termine.' },
      { title: 'Si ya usas Homebrew', command: 'brew install git', copy: true, text: 'Homebrew instala y actualiza Git desde la terminal.' },
    ],
  },
  linux: {
    label: 'Linux',
    note: 'Ubuntu, Fedora, Arch y más',
    recommended: 'Gestor de paquetes de tu distribución',
    alternatives: [
      { title: 'Debian / Ubuntu', command: 'sudo apt update && sudo apt install git', copy: true, text: 'Actualiza el índice e instala el paquete mantenido por tu distribución.' },
      { title: 'Fedora', command: 'sudo dnf install git', copy: true, text: 'Usa dnf para instalar Git en Fedora.' },
      { title: 'Arch Linux', command: 'sudo pacman -S git', copy: true, text: 'Instala Git desde los repositorios oficiales de Arch.' },
    ],
  },
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }
  return <button aria-label={`Copiar ${value}`} className="copy-button" onClick={copy} type="button">{copied ? <><Icon name="check" size={14} /> Copiado</> : 'Copiar'}</button>
}

function InstallationPage({ completed, onToggle }: { completed: string[]; onToggle: (id: SetupStepId) => void }) {
  const platform = typeof navigator === 'undefined' ? '' : `${navigator.platform} ${navigator.userAgent}`.toLowerCase()
  const detected: OperatingSystem = platform.includes('win') ? 'windows' : platform.includes('mac') ? 'mac' : 'linux'
  const [os, setOs] = useState<OperatingSystem>(detected)
  const data = installationData[os]
  const gitSteps: { id: SetupStepId; title: string; text: string }[] = [
    { id: 'git-install', title: `Instalé Git en ${data.label}`, text: 'El instalador o gestor de paquetes terminó sin errores.' },
    { id: 'git-verify', title: 'Comprobé la instalación', text: 'El comando git --version mostró un número de versión.' },
    { id: 'git-identity', title: 'Configuré mi nombre y correo', text: 'Git usará estos datos para identificar mis commits.' },
  ]

  return (
    <div className="setup-page">
      <section className="setup-hero page-width">
        <div><span className="eyebrow">PASO 01 · PREPARA TU EQUIPO</span><h1>Instala Git.<br /><em>Empieza bien.</em></h1><p>Git es el motor que guarda la historia de tu proyecto. Elige tu sistema y completa solo lo necesario.</p><div className="setup-progress-pill"><span>{completed.filter((id) => id.startsWith('git-')).length}/3</span><div><strong>Preparación de Git</strong><small>Se guarda en este navegador</small></div></div></div>
        <div className="setup-terminal"><header><i /><i /><i /><span>terminal</span></header><div><p><b>$</b> git --version</p><p className="terminal-answer">git version 2.x.x</p><p><b>$</b> git config --global user.name <em>"Tu nombre"</em></p><p><b>$</b> git config --global user.email <em>"tu@correo.com"</em></p><span>LISTO PARA CREAR HISTORIA</span></div></div>
      </section>

      <section className="install-panel page-width">
        <div className="install-panel-head"><div><span className="eyebrow">ELIGE TU SISTEMA</span><h2>Instrucciones para tu computadora.</h2></div><span>Detectamos <strong>{installationData[detected].label}</strong>. Puedes cambiarlo.</span></div>
        <div className="os-tabs" role="tablist" aria-label="Sistema operativo">
          {(Object.keys(installationData) as OperatingSystem[]).map((key) => <button aria-selected={os === key} className={os === key ? 'active' : ''} onClick={() => setOs(key)} role="tab" type="button" key={key}><PlatformIcon os={key} />{installationData[key].label}<small>{installationData[key].note}</small></button>)}
        </div>
        <div className="install-content" key={os}>
          <aside><span>RECOMENDADO</span><h3>{data.recommended}</h3><p>Usa una sola opción. No necesitas instalar Git dos veces.</p><a href={os === 'windows' ? 'https://git-scm.com/install/windows' : os === 'mac' ? 'https://git-scm.com/install/mac' : 'https://git-scm.com/install/linux'} rel="noreferrer" target="_blank">Abrir guía oficial <Icon name="arrow" size={15} /></a></aside>
          <div className="install-options">{data.alternatives.map((option, index) => <article key={option.title}><span>{String(index + 1).padStart(2, '0')}</span><div><small>{option.title}</small><code>{option.command}</code><p>{option.text}</p></div>{option.copy ? <CopyButton value={option.command} /> : <a className="copy-button" href="https://git-scm.com/downloads" rel="noreferrer" target="_blank">Descargar</a>}</article>)}</div>
        </div>
      </section>

      <section className="verify-section page-width">
        <div className="section-title"><div><span className="eyebrow">COMPRUEBA Y CONFIGURA</span><h2>Tres checks y seguimos.</h2></div><p>No marcamos nada automáticamente: confirma lo que realmente hiciste en tu equipo.</p></div>
        <div className="verify-grid">
          {gitSteps.map((step, index) => <button className={completed.includes(step.id) ? 'done' : ''} onClick={() => onToggle(step.id)} type="button" key={step.id}><span>{completed.includes(step.id) ? <Icon name="check" size={18} /> : index + 1}</span><div><strong>{step.title}</strong><p>{step.text}</p>{index === 1 && <code>git --version</code>}{index === 2 && <code>git config --global user.name "Tu nombre"</code>}</div></button>)}
        </div>
        <div className="next-route-card"><div><span>PASO 02</span><h3>Ahora instala GitHub Desktop.</h3><p>Te dará una vista gráfica para ver cambios, commits y ramas sin depender de la terminal.</p></div><a className="button primary" href="/github-desktop">Continuar <Icon name="arrow" size={18} /></a></div>
      </section>
    </div>
  )
}

function GitHubDesktopPage({ completed, onToggle }: { completed: string[]; onToggle: (id: SetupStepId) => void }) {
  const desktopSteps: { id: SetupStepId; title: string; text: string }[] = [
    { id: 'desktop-install', title: 'Instala la aplicación', text: 'Disponible oficialmente para Windows 10 de 64 bits o posterior y macOS 12 o posterior.' },
    { id: 'desktop-login', title: 'Inicia sesión en GitHub.com', text: 'La sesión permite clonar, publicar, hacer pull y push sin configurar credenciales a mano.' },
    { id: 'desktop-clone', title: 'Clona tu primer repositorio', text: 'File → Clone repository descarga una copia de GitHub a tu computadora.' },
  ]
  return <div className="desktop-page">
    <section className="desktop-hero page-width"><div><span className="eyebrow">PASO 02 · INTERFAZ GRÁFICA</span><h1>GitHub Desktop.<br /><em>Revisa antes de guardar.</em></h1><p>Ves cada archivo y su diff antes de crear un commit. También puedes cambiar de rama, hacer pull y publicar sin memorizar opciones de terminal.</p><div className="hero-actions"><a className="button primary" href="https://desktop.github.com/download/" rel="noreferrer" target="_blank">Descargar GitHub Desktop <Icon name="arrow" size={18} /></a><a className="button quiet" href="#como-funciona">Ver la interfaz</a></div><small>GitHub Desktop usa Git. La diferencia es que hace visible el estado antes de ejecutar una acción.</small></div><figure className="real-product-shot"><img alt="GitHub Desktop mostrando tres archivos modificados y el diff antes de crear un commit" src="/github-desktop-diff.png" /><figcaption>Captura real de GitHub Desktop: archivos a la izquierda, diff a la derecha y mensaje del commit abajo.</figcaption></figure></section>
    <section className="desktop-purpose page-width" id="como-funciona"><div className="section-title"><div><span className="eyebrow">LEE LA PANTALLA</span><h2>Cinco zonas. Una decisión por vez.</h2></div><p>Revisa el repositorio y la rama, selecciona archivos, lee el diff y escribe un mensaje específico.</p></div><ol className="interface-legend">{[
      ['Repositorio', 'Confirma en qué proyecto estás.'], ['Rama', 'Confirma dónde quedará el commit.'], ['Archivos', 'Marca solo los cambios relacionados.'], ['Diff', 'Lee exactamente qué agregas o eliminas.'], ['Mensaje', 'Describe una acción concreta.'],
    ].map(([title, text], index) => <li key={title}><span>{index + 1}</span><div><strong>{title}</strong><p>{text}</p></div></li>)}</ol></section>
    <section className="desktop-comparison page-width"><div className="section-title"><div><span className="eyebrow">GIT BASH Y GITHUB DESKTOP</span><h2>La terminal da control. Desktop reduce errores de contexto.</h2></div><p>Git Bash no es inseguro. El riesgo aparece cuando ejecutas un comando sin revisar la rama, el staging o el remoto.</p></div><div className="comparison-grid"><figure><img alt="Git Bash ejecutando git add, git commit y git push" src="/git-bash-example.png" /><figcaption>En Git Bash debes verificar por tu cuenta la rama, los archivos preparados y el destino del push.</figcaption></figure><article><span className="comparison-label"><FiTerminal aria-hidden="true" /> ANTES DE EJECUTAR</span><h3>Desktop muestra el contexto que la terminal deja implícito.</h3><ul><li><strong>Rama visible:</strong> reduce commits en la rama equivocada.</li><li><strong>Selección por archivo:</strong> evita incluir cambios no relacionados.</li><li><strong>Diff antes del commit:</strong> detecta secretos, logs y código accidental.</li><li><strong>Remoto visible:</strong> deja claro si harás fetch, pull o push.</li></ul><p>Para scripts y operaciones avanzadas, usa Git Bash. Para revisar y crear commits diarios, Desktop ofrece más señales visuales.</p></article></div></section>
    <section className="desktop-install page-width"><div className="desktop-install-copy"><span className="eyebrow">INSTALACIÓN GUIADA</span><h2>Instala y abre tu primer repositorio.</h2><p>GitHub Desktop tiene soporte oficial para Windows y macOS. En Linux, usa Git desde la terminal u otra interfaz.</p><a href="https://docs.github.com/es/desktop/installing-and-authenticating-to-github-desktop/installing-github-desktop" rel="noreferrer" target="_blank">Leer documentación oficial <Icon name="arrow" size={15} /></a></div><div className="desktop-install-right"><div className="desktop-platforms"><article><FaWindows aria-hidden="true" /><div><strong>Windows</strong><p>Descarga el instalador oficial y ábrelo.</p><small>Windows 10 de 64 bits o posterior</small></div></article><article><FaApple aria-hidden="true" /><div><strong>macOS</strong><p>Abre el ZIP y mueve la aplicación.</p><small>macOS 12 o posterior</small></div></article><article><FaLinux aria-hidden="true" /><div><strong>Linux</strong><p>No existe una versión oficial.</p><small>Continúa con Git en terminal</small></div></article></div><div className="desktop-checklist">{desktopSteps.map((step, index) => <button className={completed.includes(step.id) ? 'done' : ''} onClick={() => onToggle(step.id)} type="button" key={step.id}><span>{completed.includes(step.id) ? <Icon name="check" size={17} /> : index + 1}</span><div><strong>{step.title}</strong><p>{step.text}</p></div></button>)}</div></div></section>
    <section className="desktop-vocabulary page-width"><div><span className="eyebrow">TRADUCE LA INTERFAZ</span><h2>Cuando Desktop dice…</h2></div><div>{[['Changes', 'Archivos modificados que todavía no están en un commit.'], ['Commit', 'Fotografía local con un mensaje y un padre.'], ['Push origin', 'Enviar tus commits locales al repositorio remoto.'], ['Fetch / Pull', 'Buscar y traer nuevos commits del remoto.'], ['Branch', 'Un nombre móvil que apunta a un commit.']].map(([term, text]) => <article key={term}><code>{term}</code><p>{text}</p></article>)}</div></section>
    <section className="next-route-card page-width"><div><span>PASO 03</span><h3>Ya tienes las herramientas. Ahora mira Git por dentro.</h3><p>Las escenas visuales explican qué cambia realmente al hacer commit, branch, merge o rebase.</p></div><a className="button primary" href="/aprender">Abrir curso visual <Icon name="arrow" size={18} /></a></section>
  </div>
}

const commitCases = [
  { type: 'Funcionalidad', branch: 'feat/busqueda', message: 'feat(search): agrega filtro por categoría', files: ['src/search.ts', 'src/SearchPanel.tsx', 'tests/search.test.ts'], note: 'Código, interfaz y prueba de la misma función.' },
  { type: 'Hotfix', branch: 'hotfix/login-loop', message: 'fix(auth): evita redirección infinita al iniciar sesión', files: ['src/auth/callback.ts', 'tests/auth.test.ts'], note: 'Corrección urgente y su prueba de regresión.' },
  { type: 'Documentación', branch: 'docs/instalacion', message: 'docs(setup): documenta instalación en Linux', files: ['README.md', 'docs/setup-linux.md'], note: 'Solo contenido relacionado con la guía.' },
  { type: 'Refactor', branch: 'refactor/git-client', message: 'refactor(git): extrae validación de comandos', files: ['src/git/validate.ts', 'src/git/client.ts'], note: 'Mejora interna sin cambiar el comportamiento.' },
  { type: 'Dependencias', branch: 'chore/dependencies', message: 'chore(deps): actualiza cliente de Supabase', files: ['package.json', 'package-lock.json'], note: 'Manifiesto y lockfile en el mismo commit.' },
  { type: 'Configuración', branch: 'ci/cache-node', message: 'ci(actions): activa caché de npm', files: ['.github/workflows/ci.yml'], note: 'Un cambio aislado de automatización.' },
]

function CommitsPage() {
  return <div className="commits-page">
    <section className="commits-hero page-width"><span className="eyebrow">COMMITS EN PRODUCCIÓN</span><h1>Un commit.<br /><em>Una intención.</em></h1><p>Incluye los archivos que resuelven la misma tarea. Si no puedes explicar el cambio en una frase, sepáralo.</p><div className="commit-rule"><strong>Formato recomendado</strong><code>tipo(área): acción concreta</code><span>Ejemplo: <b>fix(auth): corrige expiración de sesión</b></span></div></section>
    <section className="commit-cases page-width"><div className="section-title"><div><span className="eyebrow">CASOS REALES</span><h2>Qué archivos agrupar y cómo nombrarlos.</h2></div><p>No agregues todo con <code>git add .</code> sin revisar. Prepara archivos concretos y confirma el diff.</p></div><div className="commit-case-grid">{commitCases.map((item) => <article key={item.type}><header><span>{item.type}</span><code>{item.branch}</code></header><h3>{item.message}</h3><div>{item.files.map((file) => <code key={file}>{file}</code>)}</div><p>{item.note}</p></article>)}</div></section>
    <section className="commit-check page-width"><div><span className="eyebrow">ANTES DEL COMMIT</span><h2>Revisa cuatro cosas.</h2></div><ol><li><span>1</span><strong>Rama correcta</strong><code>git branch --show-current</code></li><li><span>2</span><strong>Archivos concretos</strong><code>git add ruta/archivo</code></li><li><span>3</span><strong>Diff preparado</strong><code>git diff --staged</code></li><li><span>4</span><strong>Estado final</strong><code>git status</code></li></ol></section>
    <section className="commit-avoid page-width"><div><span>NO INCLUYAS</span><strong>.env · claves · logs · builds · cambios sin relación</strong></div><a className="button primary" href="/aprender?slide=commit">Ver cómo se mueve la rama <Icon name="arrow" size={18} /></a></section>
  </div>
}

type CommandDemo = {
  name: string
  syntax: string
  use: string
  effect: string
  diagram: 'advance' | 'sync' | 'merge' | 'stash' | 'revert' | 'rebase'
}

const commandDemos: CommandDemo[] = [
  { name: 'git commit', syntax: 'git commit -m "feat: agrega búsqueda"', use: 'Guarda los cambios preparados.', effect: 'Crea un commit y avanza la rama actual.', diagram: 'advance' },
  { name: 'git push', syntax: 'git push origin mi-rama', use: 'Publica tus commits locales.', effect: 'Actualiza la rama remota; tu rama local no cambia.', diagram: 'sync' },
  { name: 'git pull --rebase', syntax: 'git pull --rebase origin main', use: 'Trae cambios sin crear un merge innecesario.', effect: 'Actualiza la base y reproduce tus commits encima.', diagram: 'rebase' },
  { name: 'git merge', syntax: 'git merge feature', use: 'Une otra rama con la rama actual.', effect: 'Avanza directo o crea un commit de merge.', diagram: 'merge' },
  { name: 'git stash', syntax: 'git stash push -m "wip: formulario"', use: 'Aparta cambios todavía incompletos.', effect: 'Limpia el working tree; la rama no se mueve.', diagram: 'stash' },
  { name: 'git revert', syntax: 'git revert <hash>', use: 'Deshace un commit que ya fue compartido.', effect: 'Crea un nuevo commit inverso; no borra historia.', diagram: 'revert' },
]

function CommandDiagram({ type }: { type: CommandDemo['diagram'] }) {
  return <div aria-label={`Diagrama ${type}`} className={`command-diagram diagram-${type}`} role="img"><span className="branch-name">main</span><div className="command-track primary-track" /><i className="command-node node-one">a1</i><i className="command-node node-two">b2</i><i className="command-node node-three">c3</i>{type === 'advance' && <><i className="command-node new-node">d4</i><b className="movement-arrow">→</b></>}{type === 'sync' && <><div className="remote-track" /><span className="remote-name">origin/main</span><i className="remote-node">c3</i><b className="movement-arrow vertical">↓</b></>}{type === 'merge' && <><div className="feature-track" /><span className="feature-name">feature</span><i className="feature-node">f1</i><b className="merge-arrow">↘</b></>}{type === 'stash' && <><span className="stash-box">stash<br />WIP</span><b className="stash-arrow">↑</b></>}{type === 'revert' && <><i className="command-node reverted-node">d4</i><i className="command-node undo-node">e5</i><span className="revert-note">compensa d4</span></>}{type === 'rebase' && <><div className="feature-track" /><i className="feature-node old">f1</i><i className="command-node rebased-node">f1′</i><b className="rebase-arrow">↗</b></>}</div>
}

function CommandMapPage({ onView }: { onView: (slideId: string) => void }) {
  const queryCommand = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('command')
  const initial = Math.max(0, commandDemos.findIndex((item) => item.name === queryCommand))
  const [activeIndex, setActiveIndex] = useState(initial)
  const active = commandDemos[activeIndex]

  useEffect(() => onView('modelo-mental'), [onView])

  const choose = (index: number) => {
    setActiveIndex(index)
    window.history.replaceState({}, '', `/aprender?slide=modelo-mental&command=${encodeURIComponent(commandDemos[index].name)}`)
  }
  return <div className="command-map-page"><aside className="command-list"><header><Logo /><span>COMANDOS ESENCIALES</span><p>Selecciona un comando.</p></header>{commandDemos.map((item, index) => <button aria-pressed={index === activeIndex} className={index === activeIndex ? 'active' : ''} onClick={() => choose(index)} type="button" key={item.name}><code>{item.name}</code><span>{item.use}</span></button>)}</aside><section className="command-stage"><header><a href="/aprender?slide=commit"><Icon name="arrowLeft" size={17} /> Curso visual</a><span>{String(activeIndex + 1).padStart(2, '0')} / {String(commandDemos.length).padStart(2, '0')}</span></header><article><div className="command-copy"><span className="eyebrow">COMANDO</span><h1>{active.name}</h1><code>{active.syntax}</code><dl><div><dt>Para qué sirve</dt><dd>{active.use}</dd></div><div><dt>Qué cambia</dt><dd>{active.effect}</dd></div></dl></div><CommandDiagram type={active.diagram} /></article><div className="command-situations"><span className="eyebrow">SITUACIONES REALES</span><div><article><strong>Tienes cambios sin commit y necesitas actualizar tu rama</strong><code>git stash push -m "wip"</code><code>git pull --rebase origin main</code><code>git stash pop</code></article><article><strong>El commit equivocado ya llegó al remoto</strong><code>git log --oneline</code><code>git revert &lt;hash&gt;</code><code>git push origin mi-rama</code></article><article><strong>Tus cambios tienen commit, pero aún no hiciste push</strong><code>git fetch origin</code><code>git rebase origin/main</code><span>Resuelve conflictos, prueba y después publica.</span></article><article><strong>Solo quieres traer un archivo desde otra rama</strong><code>git restore --source otra-rama -- ruta/archivo</code><span>Revisa el diff y crea un commit nuevo.</span></article></div></div></section></div>
}

function CoursePage({ viewedSlides, onView, initialSlideId }: { viewedSlides: string[]; onView: (slideId: string) => void; initialSlideId?: string }) {
  const queryId = typeof window === 'undefined' ? undefined : new URLSearchParams(window.location.search).get('slide') ?? undefined
  const requestedId = queryId ?? initialSlideId
  const requestedIndex = Math.max(0, courseSlides.findIndex((slide) => slide.id === requestedId))
  const [slideIndex, setSlideIndex] = useState(requestedIndex)
  const slide = courseSlides[slideIndex]

  const goTo = (index: number) => {
    const nextIndex = Math.max(0, Math.min(courseSlides.length - 1, index))
    if (courseSlides[nextIndex].id === 'modelo-mental') {
      window.location.assign(courseHref('modelo-mental'))
      return
    }
    setSlideIndex(nextIndex)
    window.history.replaceState({}, '', courseHref(courseSlides[nextIndex].id))
  }

  useEffect(() => onView(slide.id), [slide.id, onView])

  useEffect(() => {
    const handleKeys = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') goTo(slideIndex + 1)
      if (event.key === 'ArrowLeft') goTo(slideIndex - 1)
    }
    window.addEventListener('keydown', handleKeys)
    return () => window.removeEventListener('keydown', handleKeys)
  }, [slideIndex])

  const percentage = Math.round(((slideIndex + 1) / courseSlides.length) * 100)

  return (
    <div className="course-page">
      <aside className="course-rail">
        <div className="rail-heading"><span>CURSO</span><strong>Git por dentro</strong><small>13 min · {courseSlides.length} escenas</small></div>
        <div className="rail-chapters">
          {courseChapters.map((chapter) => {
            const chapterIndex = courseSlides.findIndex((item) => item.id === chapter.slideId)
            const active = slide.chapterNumber === chapter.number
            const completed = viewedSlides.includes(chapter.slideId)
            return <button className={active ? 'active' : ''} onClick={() => goTo(chapterIndex)} type="button" key={chapter.number}><span>{completed ? <Icon name="check" size={14} /> : chapter.number}</span><div><small>CAPÍTULO {chapter.number}</small><strong>{chapter.title}</strong></div></button>
          })}
        </div>
        <a className="rail-practice" href="/ejercicios"><Icon name="terminal" size={18} /><span><small>DESPUÉS DEL CURSO</small><strong>Mueve el grafo</strong></span><Icon name="arrow" size={16} /></a>
      </aside>

      <section className="slide-area">
        <div className="slide-progress"><div><span style={{ width: `${percentage}%` }} /></div><strong>{String(slideIndex + 1).padStart(2, '0')}</strong><span>/ {String(courseSlides.length).padStart(2, '0')}</span></div>
        <article className="lesson-slide" key={slide.id} aria-live="polite">
          <div className="slide-copy">
            <div className="slide-kicker"><span>{slide.chapterNumber}</span>{slide.eyebrow}</div>
            <h1>{slide.title}<br /><em>{slide.accent}</em></h1>
            <p className="slide-summary">{slide.summary}</p>
            <ul>{slide.bullets.map((bullet) => <li key={bullet}><Icon name="check" size={15} />{bullet}</li>)}</ul>
            {slide.command && <code className="slide-command"><span>$</span> {slide.command}</code>}
            <div className="takeaway"><Icon name="spark" size={18} /><div><small>QUÉDATE CON ESTO</small><strong>{slide.takeaway}</strong></div></div>
          </div>
          <div className="slide-visual-wrap"><CourseVisual kind={slide.visual} /><div className="visual-caption"><span>MODELO VISUAL</span><p>{slide.chapter}</p></div></div>
        </article>
        <div className="slide-controls">
          <button disabled={slideIndex === 0} onClick={() => goTo(slideIndex - 1)} type="button"><Icon name="arrowLeft" size={18} /><span>Anterior</span></button>
          <div className="slide-dots" aria-label="Escenas del curso">{courseSlides.map((item, index) => <button aria-label={`Ir a ${item.title}`} className={index === slideIndex ? 'active' : viewedSlides.includes(item.id) ? 'seen' : ''} onClick={() => goTo(index)} type="button" key={item.id} />)}</div>
          {slideIndex < courseSlides.length - 1 ? <button className="next" onClick={() => goTo(slideIndex + 1)} type="button"><span>Siguiente</span><Icon name="arrow" size={18} /></button> : <a className="finish" href="/ejercicios"><span>Ir a practicar</span><Icon name="arrow" size={18} /></a>}
        </div>
        <p className="keyboard-hint"><kbd>←</kbd><kbd>→</kbd> también puedes usar las flechas del teclado</p>
      </section>
    </div>
  )
}

function ChallengeLabPage({ completedChallenges, onComplete }: { completedChallenges: string[]; onComplete: (challengeId: string) => void }) {
  const fromQuery = (() => {
    if (typeof window === 'undefined') return undefined
    const id = new URLSearchParams(window.location.search).get('level')
    return challenges.find((challenge) => challenge.id === id)
  })()
  const initial = fromQuery ?? challenges.find((challenge) => !completedChallenges.includes(challenge.id)) ?? challenges[0]
  const [active, setActive] = useState<Challenge>(initial)
  const [session, setSession] = useState<ChallengeState>(() => createChallengeSession(initial))
  const [command, setCommand] = useState('')
  const currentStep = active.steps[session.currentStep]

  const choose = (challenge: Challenge) => {
    setActive(challenge)
    setSession(createChallengeSession(challenge))
    setCommand('')
    window.history.replaceState({}, '', labHref(challenge.id))
  }
  const execute = (event: FormEvent) => {
    event.preventDefault()
    if (!command.trim()) return
    const result = runChallengeCommand(session, active, command)
    setSession(result.state)
    setCommand('')
    if (result.state.completed) onComplete(active.id)
  }
  const reset = () => {
    setSession(createChallengeSession(active))
    setCommand('')
  }
  const nextChallenge = challenges[challenges.findIndex((challenge) => challenge.id === active.id) + 1]

  return <div className="challenge-page">
    <aside className="challenge-sidebar">
      <div className="challenge-sidebar-head"><span>LABORATORIO</span><strong>Aprende moviendo</strong><small>{completedChallenges.length}/{challenges.length} niveles resueltos</small></div>
      {challengeWorlds.map((world) => <section key={world}><header><span>{world}</span><small>{challenges.filter((challenge) => challenge.world === world).length} niveles</small></header>{challenges.filter((challenge) => challenge.world === world).map((challenge) => {
        const done = completedChallenges.includes(challenge.id)
        return <button className={active.id === challenge.id ? 'active' : ''} onClick={() => choose(challenge)} type="button" key={challenge.id}><span className={done ? 'done' : ''}>{done ? <Icon name="check" size={14} /> : challenge.number}</span><div><strong>{challenge.shortTitle}</strong><small>{challenge.difficulty} · {challenge.duration}</small></div><Icon name="arrow" size={14} /></button>
      })}</section>)}
      <div className="challenge-attribution"><span>INSPIRACIÓN</span><p>Concepto de niveles inspirado en Learn Git Branching, proyecto de Peter Cottle bajo licencia MIT.</p><a href="https://github.com/pcottle/learnGitBranching" rel="noreferrer" target="_blank">Ver proyecto original ↗</a></div>
    </aside>
    <section className="challenge-main">
      <header className="challenge-topbar"><a href="/ejercicios"><Logo /></a><div><span>NIVEL {active.number}</span><strong>{active.title}</strong></div><button onClick={reset} type="button"><Icon name="refresh" size={15} />Reiniciar</button></header>
      <div className="challenge-workspace">
        <section className="challenge-objective">
          <div className="challenge-tags"><span>{active.world}</span><span>{active.difficulty}</span><span>{active.duration}</span></div>
          <h1>{active.title}.</h1><p>{active.story}</p>
          <article><span>OBJETIVO</span><strong>{active.objective}</strong></article>
          <article className="mental-model"><span>MODELO MENTAL</span><p>{active.mentalModel}</p></article>
          <div className="challenge-steps">{active.steps.map((step, index) => <div className={index < session.currentStep || session.completed ? 'done' : index === session.currentStep ? 'current' : ''} key={`${step.matcher}-${index}`}><span>{index < session.currentStep || session.completed ? <Icon name="check" size={13} /> : index + 1}</span><p>{step.instruction}</p></div>)}</div>
        </section>
        <section className="challenge-simulator">
          <div className="challenge-graph-head"><span><i /> GRAFO EN VIVO</span><code>HEAD → {session.head.ref}</code></div>
          <GraphBoard state={session} />
          <div className="challenge-terminal">
            <header><span><i /><i /><i />gitpath / {active.id}</span><small>{session.attempts} {session.attempts === 1 ? 'intento' : 'intentos'}</small></header>
            <div className="challenge-transcript" aria-live="polite">{session.transcript.slice(-5).map((line, index) => <div className={line.type} key={`${line.type}-${index}`}>{line.type === 'command' && <b>$ </b>}{line.text}</div>)}</div>
            <form onSubmit={execute}><b>$</b><input aria-label="Comando de Git para el nivel" autoCapitalize="none" autoComplete="off" disabled={session.completed} onChange={(event) => setCommand(event.target.value)} placeholder={session.completed ? 'Nivel completado' : 'escribe un comando de Git…'} spellCheck={false} value={command} /><button disabled={session.completed} type="submit">Ejecutar <Icon name="arrow" size={15} /></button></form>
          </div>
          <div className={`challenge-feedback ${session.feedback.tone}`}><span>{session.feedback.tone === 'success' ? <Icon name="check" size={17} /> : <Icon name="spark" size={17} />}</span><div><small>{session.feedback.tone === 'success' ? 'NIVEL COMPLETADO' : session.feedback.tone === 'error' ? 'PISTA' : 'QUÉ ESTÁ PASANDO'}</small><p>{session.feedback.text}</p></div>{currentStep && !session.completed ? <button onClick={() => setCommand(currentStep.example)} type="button"><span>Usar ejemplo</span><code>{currentStep.example}</code></button> : nextChallenge ? <button onClick={() => choose(nextChallenge)} type="button">Siguiente nivel <Icon name="arrow" size={15} /></button> : <a href="/progreso">Ver mi progreso <Icon name="arrow" size={15} /></a>}</div>
        </section>
      </div>
    </section>
  </div>
}

function ProgressPage({ viewedSlides, completedChallenges, setupProgress, onReset }: { viewedSlides: string[]; completedChallenges: string[]; setupProgress: string[]; onReset: () => void }) {
  const setupPercent = Math.round((setupProgress.length / SETUP_STEP_IDS.length) * 100)
  const coursePercent = Math.round((viewedSlides.length / courseSlides.length) * 100)
  const labPercent = Math.round((completedChallenges.length / challenges.length) * 100)
  return <div className="progress-page page-width">
    <header><span className="eyebrow">MI PROGRESO</span><h1>Tu mapa,<br />paso a paso.</h1><p>La preparación, las escenas y los niveles se guardan únicamente en este navegador.</p></header>
    <section className="progress-cards progress-cards-three">
      <article><div className="big-progress setup"><strong>{setupPercent}%</strong><span>preparación</span></div><div><span>INSTALAR</span><h2>{setupProgress.length} de {SETUP_STEP_IDS.length} checks</h2><div className="bar"><i style={{ width: `${setupPercent}%` }} /></div><a href={setupProgress.filter((id) => id.startsWith('git-')).length < 3 ? '/instalar' : '/github-desktop'}>Continuar preparación <Icon name="arrow" size={17} /></a></div></article>
      <article><div className="big-progress"><strong>{coursePercent}%</strong><span>curso visual</span></div><div><span>ENTENDER</span><h2>{viewedSlides.length} de {courseSlides.length} escenas</h2><div className="bar"><i style={{ width: `${coursePercent}%` }} /></div><a href={courseHref(courseSlides.find((slide) => !viewedSlides.includes(slide.id))?.id ?? 'modelo-mental')}>Continuar curso <Icon name="arrow" size={17} /></a></div></article>
      <article><div className="big-progress practice"><strong>{labPercent}%</strong><span>ejercicios</span></div><div><span>PRACTICAR</span><h2>{completedChallenges.length} de {challenges.length} niveles</h2><div className="bar"><i style={{ width: `${labPercent}%` }} /></div><a href={labHref(challenges.find((challenge) => !completedChallenges.includes(challenge.id))?.id)}>Abrir ejercicios <Icon name="arrow" size={17} /></a></div></article>
    </section>
    <section className="progress-detail"><div className="section-title"><div><span className="eyebrow">CURSO VISUAL</span><h2>Tu mapa de conceptos.</h2></div><button onClick={onReset} type="button"><Icon name="refresh" size={15} />Reiniciar todo</button></div><div>{courseSlides.map((slide, index) => <a className={viewedSlides.includes(slide.id) ? 'seen' : ''} href={courseHref(slide.id)} key={slide.id}><span>{viewedSlides.includes(slide.id) ? <Icon name="check" size={15} /> : String(index + 1).padStart(2, '0')}</span><div><small>{slide.chapter}</small><strong>{slide.title}</strong></div><Icon name="arrow" size={16} /></a>)}</div></section>
  </div>
}

function NotFoundPage() {
  return <section className="not-found page-width"><span>404 · RUTA NO ENCONTRADA</span><h1>Este puntero no lleva a ningún commit.</h1><p>Volvamos al mapa y elige una ruta conocida.</p><a className="button primary" href="/">Volver al inicio <Icon name="arrow" size={18} /></a></section>
}

function App() {
  const path = currentPath()
  const slideIds = new Set(courseSlides.map((slide) => slide.id))
  const challengeIds = new Set(challenges.map((challenge) => challenge.id))
  const setupIds = new Set<string>(SETUP_STEP_IDS)
  const [viewedSlides, setViewedSlides] = useState<string[]>(() => readStoredList(COURSE_PROGRESS_KEY, slideIds))
  const [completedChallenges, setCompletedChallenges] = useState<string[]>(() => readStoredList(PRACTICE_PROGRESS_KEY, challengeIds))
  const [setupProgress, setSetupProgress] = useState<string[]>(() => readStoredList(SETUP_PROGRESS_KEY, setupIds))
  const [user, setUser] = useState<User | null>(null)
  const [authMode, setAuthMode] = useState<AuthMode | null>(null)

  useEffect(() => window.localStorage.setItem(COURSE_PROGRESS_KEY, JSON.stringify(viewedSlides)), [viewedSlides])
  useEffect(() => window.localStorage.setItem(PRACTICE_PROGRESS_KEY, JSON.stringify(completedChallenges)), [completedChallenges])
  useEffect(() => window.localStorage.setItem(SETUP_PROGRESS_KEY, JSON.stringify(setupProgress)), [setupProgress])
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  const markViewed = (slideId: string) => setViewedSlides((current) => current.includes(slideId) ? current : [...current, slideId])
  const markCompleted = (challengeId: string) => setCompletedChallenges((current) => current.includes(challengeId) ? current : [...current, challengeId])
  const toggleSetup = (stepId: SetupStepId) => setSetupProgress((current) => current.includes(stepId) ? current.filter((id) => id !== stepId) : [...current, stepId])
  const resetProgress = () => {
    if (window.confirm('¿Quieres reiniciar toda la ruta guardada en este navegador?')) {
      setViewedSlides([])
      setCompletedChallenges([])
      setSetupProgress([])
    }
  }
  const signOut = async () => {
    await supabase?.auth.signOut()
  }

  let page: ReactNode
  let minimal = false

  if (path === '/') page = <HomePage completedChallenges={completedChallenges} setupProgress={setupProgress} viewedSlides={viewedSlides} />
  else if (path === '/instalar') page = <InstallationPage completed={setupProgress} onToggle={toggleSetup} />
  else if (path === '/github-desktop') page = <GitHubDesktopPage completed={setupProgress} onToggle={toggleSetup} />
  else if (path === '/commits') page = <CommitsPage />
  else if (path === '/aprender' || path === '/fundamentos') {
    const requestedSlide = typeof window === 'undefined' ? undefined : new URLSearchParams(window.location.search).get('slide') ?? undefined
    page = path === '/aprender' && (!requestedSlide || requestedSlide === 'modelo-mental') ? <CommandMapPage onView={markViewed} /> : <CoursePage initialSlideId={path === '/fundamentos' ? 'commit' : undefined} onView={markViewed} viewedSlides={viewedSlides} />
    minimal = true
  } else if (path === '/ramas-y-prs') {
    page = <CoursePage initialSlideId="ramas" onView={markViewed} viewedSlides={viewedSlides} />
    minimal = true
  } else if (path === '/ejercicios' || path === '/laboratorio') {
    page = <ChallengeLabPage completedChallenges={completedChallenges} onComplete={markCompleted} />
    minimal = true
  } else if (path === '/progreso') page = <ProgressPage completedChallenges={completedChallenges} onReset={resetProgress} setupProgress={setupProgress} viewedSlides={viewedSlides} />
  else page = <NotFoundPage />

  return <><AppShell minimal={minimal} onOpenAuth={setAuthMode} onSignOut={signOut} path={path} user={user}>{page}</AppShell>{authMode && <AuthDialog mode={authMode} onClose={() => setAuthMode(null)} onModeChange={setAuthMode} />}</>
}

export default App
