import { type CSSProperties, type FormEvent, type ReactNode, useEffect, useState } from 'react'
import { GraphBoard } from './components/GraphBoard'
import { challenges, challengeWorlds, type Challenge } from './data/challenges'
import { courseChapters, courseSlides, type VisualKind } from './data/course'
import { createChallengeSession, runChallengeCommand, type ChallengeState } from './lib/challenge-simulator'

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
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  const paths: Record<IconName, ReactNode> = {
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    arrowLeft: <path d="M19 12H5m6 6-6-6 6-6" />,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" /><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5v-16Z" /></>,
    branch: <><circle cx="6" cy="5" r="2" /><circle cx="18" cy="19" r="2" /><circle cx="6" cy="19" r="2" /><path d="M6 7v10M8 19h7a3 3 0 0 0 3-3V7" /></>,
    check: <path d="m5 12 4.2 4.2L19 6.5" />,
    code: <><path d="m8.5 8-4 4 4 4M15.5 8l4 4-4 4M13.5 5l-3 14" /></>,
    commit: <><path d="M3 12h6m6 0h6" /><circle cx="12" cy="12" r="3" /></>,
    layers: <><path d="m12 3-9 5 9 5 9-5-9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
    play: <path d="m8 5 11 7-11 7V5Z" />,
    refresh: <><path d="M20 7v5h-5" /><path d="M4 17v-5h5" /><path d="M6.1 8a7 7 0 0 1 11.8-1L20 12M4 12l2.1 5A7 7 0 0 0 18 16" /></>,
    shield: <><path d="M12 3 19 6v5c0 4.3-2.7 7.8-7 10-4.3-2.2-7-5.7-7-10V6l7-3Z" /><path d="m8.7 12 2.1 2.1 4.5-4.5" /></>,
    spark: <><path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z" /><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" /></>,
    terminal: <><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="m7 9 3 3-3 3m6 0h4" /></>,
  }

  return <svg {...common}>{paths[name]}</svg>
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

function Navigation({ path, learnedCount, totalCount }: { path: string; learnedCount: number; totalCount: number }) {
  const items = [
    { href: '/instalar', label: 'Instalar', match: ['/instalar'] },
    { href: '/github-desktop', label: 'GitHub Desktop', match: ['/github-desktop'] },
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
        <a className="nav-progress" href="/progreso" aria-label={`${learnedCount} de ${totalCount} pasos completados`}>
          <span className="progress-ring" style={{ '--progress': `${Math.round((learnedCount / totalCount) * 360)}deg` } as CSSProperties}><i /></span>
          <span><strong>{Math.round((learnedCount / totalCount) * 100)}%</strong><small>ruta</small></span>
        </a>
      </nav>
    </header>
  )
}

function AppShell({ children, path, learnedCount, totalCount, minimal = false }: { children: ReactNode; path: string; learnedCount: number; totalCount: number; minimal?: boolean }) {
  return (
    <main>
      <Navigation path={path} learnedCount={learnedCount} totalCount={totalCount} />
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
          <div className="hero-proof"><span><Icon name="check" size={15} /> En español</span><span><Icon name="check" size={15} /> Sin registro</span><span><Icon name="check" size={15} /> Progreso local</span></div>
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
          {(Object.keys(installationData) as OperatingSystem[]).map((key) => <button aria-selected={os === key} className={os === key ? 'active' : ''} onClick={() => setOs(key)} role="tab" type="button" key={key}><span className={`os-symbol os-${key}`} aria-hidden="true" />{installationData[key].label}<small>{installationData[key].note}</small></button>)}
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

function DesktopMockup() {
  return <div aria-hidden="true" className="desktop-mockup"><header><i /><i /><i /><span>GitPath — GitHub Desktop</span></header><div className="desktop-toolbar"><strong>Current repository <b>GitPath⌄</b></strong><strong>Current branch <b>main⌄</b></strong><span className="desktop-fetch">Fetch origin</span></div><div className="desktop-body"><aside><span>3 changed files</span><p className="selected"><i /> App.tsx <b>+24 −3</b></p><p><i /> index.css <b>+18</b></p><p><i /> README.md <b>+4</b></p><div className="desktop-commit"><strong>Explica la instalación</strong><p>Añade la ruta inicial para nuevos usuarios.</p><span>Commit to main</span></div></aside><section><div className="desktop-file-head"><span>src/App.tsx</span><small>24 additions, 3 deletions</small></div><pre><b>+ </b>function InstallationPage() {'{'}{`\n`}<b>+   </b>return &lt;Guide platform="mac" /&gt;{`\n`}<b>+ </b>{'}'}{`\n`}  export default App</pre></section></div><div className="desktop-callout callout-repo">1 <span>Repositorio actual</span></div><div className="desktop-callout callout-branch">2 <span>Rama actual</span></div><div className="desktop-callout callout-sync">3 <span>Pull / Push</span></div><div className="desktop-callout callout-files">4 <span>Archivos cambiados</span></div><div className="desktop-callout callout-commit">5 <span>Crear commit</span></div></div>
}

function GitHubDesktopPage({ completed, onToggle }: { completed: string[]; onToggle: (id: SetupStepId) => void }) {
  const desktopSteps: { id: SetupStepId; title: string; text: string }[] = [
    { id: 'desktop-install', title: 'Instala la aplicación', text: 'Disponible oficialmente para Windows 10 de 64 bits o posterior y macOS 12 o posterior.' },
    { id: 'desktop-login', title: 'Inicia sesión en GitHub.com', text: 'La sesión permite clonar, publicar, hacer pull y push sin configurar credenciales a mano.' },
    { id: 'desktop-clone', title: 'Clona tu primer repositorio', text: 'File → Clone repository descarga una copia de GitHub a tu computadora.' },
  ]
  return <div className="desktop-page">
    <section className="desktop-hero page-width"><div><span className="eyebrow">PASO 02 · TU MAPA VISUAL</span><h1>GitHub Desktop,<br /><em>sin misterio.</em></h1><p>Es una interfaz para usar Git: ves qué archivos cambiaron, eliges qué guardar, creas commits y sincronizas con GitHub.</p><div className="hero-actions"><a className="button primary" href="https://desktop.github.com/download/" rel="noreferrer" target="_blank">Descargar GitHub Desktop <Icon name="arrow" size={18} /></a><a className="button quiet" href="#como-funciona">Ver cómo funciona</a></div><small>GitHub Desktop no reemplaza Git: lo controla con una interfaz gráfica.</small></div><DesktopMockup /></section>
    <section className="desktop-purpose page-width" id="como-funciona"><div className="section-title"><div><span className="eyebrow">PARA QUÉ SIRVE</span><h2>De tus archivos a GitHub, en cinco movimientos.</h2></div><p>La interfaz cambia, pero el modelo mental es el mismo que aprenderás en el curso.</p></div><div className="purpose-flow">{[
      ['01', 'Editas', 'Cambias archivos en tu editor.'], ['02', 'Revisas', 'Desktop muestra el diff.'], ['03', 'Commit', 'Guardas una fotografía local.'], ['04', 'Push', 'Subes commits a GitHub.'], ['05', 'Pull', 'Traes el trabajo del equipo.'],
    ].map(([number, title, text], index) => <article key={number}><span>{number}</span><div className={`purpose-icon purpose-${index}`}><Icon name={(['code', 'book', 'commit', 'arrow', 'refresh'] as IconName[])[index]} size={21} /></div><strong>{title}</strong><p>{text}</p></article>)}</div></section>
    <section className="desktop-install page-width"><div className="desktop-install-copy"><span className="eyebrow">INSTALACIÓN GUIADA</span><h2>Tres pasos para quedar listo.</h2><p>La descarga oficial detecta Windows o macOS. En Linux, GitHub Desktop todavía no tiene soporte oficial; puedes usar Git en terminal o una interfaz alternativa.</p><a href="https://docs.github.com/es/desktop/installing-and-authenticating-to-github-desktop/installing-github-desktop" rel="noreferrer" target="_blank">Leer documentación oficial <Icon name="arrow" size={15} /></a></div><div className="desktop-install-right"><div className="desktop-platforms"><article><span className="os-symbol os-windows" /><div><strong>Windows</strong><p>Descarga el archivo de instalación, ábrelo y espera a que Desktop inicie.</p><small>Windows 10 de 64 bits o posterior</small></div></article><article><span className="os-symbol os-mac" /><div><strong>macOS</strong><p>Abre el ZIP descargado y después la aplicación GitHub Desktop.</p><small>macOS 12 o posterior</small></div></article><article><span className="os-symbol os-linux" /><div><strong>Linux</strong><p>No existe una versión oficial. GitPath funciona sin instalar Desktop.</p><small>Continúa con Git en terminal</small></div></article></div><div className="desktop-checklist">{desktopSteps.map((step, index) => <button className={completed.includes(step.id) ? 'done' : ''} onClick={() => onToggle(step.id)} type="button" key={step.id}><span>{completed.includes(step.id) ? <Icon name="check" size={17} /> : index + 1}</span><div><strong>{step.title}</strong><p>{step.text}</p></div></button>)}</div></div></section>
    <section className="desktop-vocabulary page-width"><div><span className="eyebrow">TRADUCE LA INTERFAZ</span><h2>Cuando Desktop dice…</h2></div><div>{[['Changes', 'Archivos modificados que todavía no están en un commit.'], ['Commit', 'Fotografía local con un mensaje y un padre.'], ['Push origin', 'Enviar tus commits locales al repositorio remoto.'], ['Fetch / Pull', 'Buscar y traer nuevos commits del remoto.'], ['Branch', 'Un nombre móvil que apunta a un commit.']].map(([term, text]) => <article key={term}><code>{term}</code><p>{text}</p></article>)}</div></section>
    <section className="next-route-card page-width"><div><span>PASO 03</span><h3>Ya tienes las herramientas. Ahora mira Git por dentro.</h3><p>Las escenas visuales explican qué cambia realmente al hacer commit, branch, merge o rebase.</p></div><a className="button primary" href="/aprender">Abrir curso visual <Icon name="arrow" size={18} /></a></section>
  </div>
}

function CoursePage({ viewedSlides, onView, initialSlideId }: { viewedSlides: string[]; onView: (slideId: string) => void; initialSlideId?: string }) {
  const queryId = typeof window === 'undefined' ? undefined : new URLSearchParams(window.location.search).get('slide') ?? undefined
  const requestedId = queryId ?? initialSlideId
  const requestedIndex = Math.max(0, courseSlides.findIndex((slide) => slide.id === requestedId))
  const [slideIndex, setSlideIndex] = useState(requestedIndex)
  const slide = courseSlides[slideIndex]

  const goTo = (index: number) => {
    const nextIndex = Math.max(0, Math.min(courseSlides.length - 1, index))
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

  useEffect(() => window.localStorage.setItem(COURSE_PROGRESS_KEY, JSON.stringify(viewedSlides)), [viewedSlides])
  useEffect(() => window.localStorage.setItem(PRACTICE_PROGRESS_KEY, JSON.stringify(completedChallenges)), [completedChallenges])
  useEffect(() => window.localStorage.setItem(SETUP_PROGRESS_KEY, JSON.stringify(setupProgress)), [setupProgress])

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

  let page: ReactNode
  let minimal = false

  if (path === '/') page = <HomePage completedChallenges={completedChallenges} setupProgress={setupProgress} viewedSlides={viewedSlides} />
  else if (path === '/instalar') page = <InstallationPage completed={setupProgress} onToggle={toggleSetup} />
  else if (path === '/github-desktop') page = <GitHubDesktopPage completed={setupProgress} onToggle={toggleSetup} />
  else if (path === '/aprender' || path === '/fundamentos') {
    page = <CoursePage initialSlideId={path === '/fundamentos' ? 'commit' : undefined} onView={markViewed} viewedSlides={viewedSlides} />
    minimal = true
  } else if (path === '/ramas-y-prs') {
    page = <CoursePage initialSlideId="ramas" onView={markViewed} viewedSlides={viewedSlides} />
    minimal = true
  } else if (path === '/ejercicios' || path === '/laboratorio') {
    page = <ChallengeLabPage completedChallenges={completedChallenges} onComplete={markCompleted} />
    minimal = true
  } else if (path === '/progreso') page = <ProgressPage completedChallenges={completedChallenges} onReset={resetProgress} setupProgress={setupProgress} viewedSlides={viewedSlides} />
  else page = <NotFoundPage />

  const learnedCount = viewedSlides.length + completedChallenges.length + setupProgress.length
  const totalCount = courseSlides.length + challenges.length + SETUP_STEP_IDS.length
  return <AppShell learnedCount={learnedCount} minimal={minimal} path={path} totalCount={totalCount}>{page}</AppShell>
}

export default App
