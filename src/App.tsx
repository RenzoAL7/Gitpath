import { type CSSProperties, type FormEvent, type ReactNode, useEffect, useState } from 'react'
import { courseChapters, courseSlides, type VisualKind } from './data/course'
import { lessons, type Lesson } from './data/lessons'
import { createSession, runCommand, type SimulatorState } from './lib/git-simulator'

const PRACTICE_PROGRESS_KEY = 'gitpath:completed-lessons:v2'
const COURSE_PROGRESS_KEY = 'gitpath:viewed-slides:v1'

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

function lessonHref(lessonId: string) {
  return `/ruta/${lessonId}`
}

function labHref(lessonId?: string) {
  return lessonId ? `/laboratorio?lesson=${encodeURIComponent(lessonId)}` : '/laboratorio'
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

function Navigation({ path, learnedCount }: { path: string; learnedCount: number }) {
  const items = [
    { href: '/aprender', label: 'Curso visual', match: ['/aprender', '/fundamentos', '/ramas-y-prs'] },
    { href: '/laboratorio', label: 'Laboratorio', match: ['/laboratorio'] },
    { href: '/progreso', label: 'Mi progreso', match: ['/progreso'] },
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
        <a className="nav-progress" href="/progreso" aria-label={`${learnedCount} de ${courseSlides.length} escenas vistas`}>
          <span className="progress-ring" style={{ '--progress': `${Math.round((learnedCount / courseSlides.length) * 360)}deg` } as CSSProperties}><i /></span>
          <span><strong>{learnedCount}/{courseSlides.length}</strong><small>escenas</small></span>
        </a>
      </nav>
    </header>
  )
}

function AppShell({ children, path, learnedCount, minimal = false }: { children: ReactNode; path: string; learnedCount: number; minimal?: boolean }) {
  return (
    <main>
      <Navigation path={path} learnedCount={learnedCount} />
      {children}
      {!minimal && (
        <footer className="footer page-width">
          <a href="/"><Logo /></a>
          <p>Una explicación visual de Git para dejar de copiar comandos a ciegas.</p>
          <div><a href="/aprender">Aprender</a><a href="/laboratorio">Practicar</a><a href="https://github.com/RenzoAL7/Gitpath" rel="noreferrer" target="_blank">GitHub ↗</a></div>
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

function HomePage({ viewedSlides, completedLessons }: { viewedSlides: string[]; completedLessons: string[] }) {
  const firstUnseen = courseSlides.find((slide) => !viewedSlides.includes(slide.id)) ?? courseSlides[courseSlides.length - 1]
  const resumeLabel = viewedSlides.length ? 'Continuar curso' : 'Empezar el curso'

  return (
    <>
      <section className="home-hero page-width">
        <div className="hero-copy">
          <div className="eyebrow"><span>CURSO VISUAL</span><i />13 MIN · EN ESPAÑOL</div>
          <h1>Deja de memorizar Git.<br /><em>Empieza a verlo.</em></h1>
          <p>Una explicación visual para entender qué son realmente los commits, las ramas, HEAD y las formas seguras de volver atrás.</p>
          <div className="hero-actions">
            <a className="button primary" href={courseHref(firstUnseen.id)}><Icon name="play" size={18} />{resumeLabel}</a>
            <a className="button quiet" href="/laboratorio">Ir a los ejercicios <Icon name="arrow" size={18} /></a>
          </div>
          <div className="hero-proof"><span><Icon name="check" size={15} /> Sin registro</span><span><Icon name="check" size={15} /> A tu ritmo</span><span><Icon name="check" size={15} /> Desde cero</span></div>
        </div>

        <a className="hero-slide" href={courseHref(firstUnseen.id)} aria-label={`Abrir escena: ${firstUnseen.title}`}>
          <div className="hero-slide-top"><span>GIT POR DENTRO</span><span>{String(Math.max(viewedSlides.length + 1, 1)).padStart(2, '0')} / {courseSlides.length}</span></div>
          <CourseVisual kind="cover" compact />
          <div className="hero-slide-bottom"><div><small>IDEA 01</small><strong>Git es un mapa de objetos y punteros.</strong></div><span><Icon name="arrow" size={21} /></span></div>
        </a>
      </section>

      <section className="chapter-section page-width">
        <div className="section-title"><div><span className="eyebrow">EL RECORRIDO</span><h2>Cuatro ideas. Una caja negra menos.</h2></div><p>Avanza como en una presentación: una escena, una idea y un dibujo a la vez.</p></div>
        <div className="chapter-grid">
          {courseChapters.map((chapter, index) => (
            <a href={courseHref(chapter.slideId)} key={chapter.number}>
              <span>{chapter.number}</span><div className={`chapter-icon chapter-icon-${index}`}><Icon name={(['layers', 'branch', 'commit', 'shield'] as IconName[])[index]} size={24} /></div>
              <h3>{chapter.title}</h3><p>{['Commits y grafos', 'Ramas y HEAD', 'Working tree y staging', 'Restore, reset y reflog'][index]}</p><Icon name="arrow" size={18} />
            </a>
          ))}
        </div>
      </section>

      <section className="practice-teaser page-width">
        <div className="practice-visual">
          <div className="terminal-mini"><header><i /><i /><i /><span>gitpath / sandbox</span></header><pre><b>$</b> git status{`\n`}On branch main{`\n`}<b>$</b> git switch -c feat/perfil<span>▌</span></pre></div>
          <div className="practice-graph"><span>HEAD</span><div /><i /><i /><i /></div>
        </div>
        <div className="practice-copy"><span className="eyebrow">APARTADO PRÁCTICO</span><h2>Cuando quieras probarlo, el laboratorio te espera.</h2><p>{lessons.length} escenarios seguros para escribir comandos, ver el estado del repositorio y equivocarte sin tocar un proyecto real.</p><div><a className="button light" href={labHref()}>Abrir laboratorio <Icon name="arrow" size={18} /></a><span>{completedLessons.length}/{lessons.length} ejercicios completados</span></div></div>
      </section>
    </>
  )
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
        <a className="rail-practice" href="/laboratorio"><Icon name="terminal" size={18} /><span><small>DESPUÉS DEL CURSO</small><strong>Practica en el laboratorio</strong></span><Icon name="arrow" size={16} /></a>
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
          {slideIndex < courseSlides.length - 1 ? <button className="next" onClick={() => goTo(slideIndex + 1)} type="button"><span>Siguiente</span><Icon name="arrow" size={18} /></button> : <a className="finish" href="/laboratorio"><span>Ir a practicar</span><Icon name="arrow" size={18} /></a>}
        </div>
        <p className="keyboard-hint"><kbd>←</kbd><kbd>→</kbd> también puedes usar las flechas del teclado</p>
      </section>
    </div>
  )
}

function RepoMap({ session }: { session: SimulatorState }) {
  return (
    <div className="repo-map">
      <div className="repo-map-head"><span><i /> REPOSITORIO EN VIVO</span><code>HEAD → {session.currentBranch}</code></div>
      <div className="repo-lanes">
        {session.branches.map((branch) => {
          const active = branch === session.currentBranch
          return <div className={active ? 'repo-lane active' : 'repo-lane'} key={branch}><span>{branch}</span><div className="repo-track">{session.commits.slice(-3).map((commit, index) => <i className={active && index === session.commits.slice(-3).length - 1 ? 'current' : ''} key={`${branch}-${commit}-${index}`}><small>{commit}</small></i>)}</div></div>
        })}
      </div>
      <div className="repo-state"><span><i className={session.workingTree === 'clean' ? 'green' : 'orange'} />working tree: {session.workingTree}</span><span><i className={session.staged ? 'purple' : ''} />staging: {session.staged ? '1 cambio' : 'vacío'}</span></div>
    </div>
  )
}

function LabPage({ completedLessons, onComplete }: { completedLessons: string[]; onComplete: (lessonId: string) => void }) {
  const lessonFromQuery = (() => {
    if (typeof window === 'undefined') return undefined
    const id = new URLSearchParams(window.location.search).get('lesson')
    return lessons.find((lesson) => lesson.id === id)
  })()
  const initialLesson = lessonFromQuery ?? lessons.find((lesson) => !completedLessons.includes(lesson.id)) ?? lessons[0]
  const [activeLesson, setActiveLesson] = useState(initialLesson)
  const [session, setSession] = useState<SimulatorState>(() => createSession(initialLesson))
  const [command, setCommand] = useState('')

  const chooseLesson = (lesson: Lesson) => {
    setActiveLesson(lesson)
    setSession(createSession(lesson))
    setCommand('')
    window.history.replaceState({}, '', labHref(lesson.id))
  }

  const execute = (event: FormEvent) => {
    event.preventDefault()
    if (!command.trim()) return
    const result = runCommand(session, activeLesson, command)
    setSession(result.state)
    setCommand('')
    if (result.state.completed) onComplete(activeLesson.id)
  }

  const resetSession = () => {
    setSession(createSession(activeLesson))
    setCommand('')
  }

  const suggested = !session.completed ? activeLesson.steps[session.currentStep]?.command : undefined

  return (
    <div className="lab-page page-width">
      <header className="lab-hero"><div><span className="eyebrow">LABORATORIO · APARTADO PRÁCTICO</span><h1>Ahora sí: mueve el repositorio.</h1><p>Prueba comandos dentro de un entorno simulado. Ves el resultado, recibes una pista y puedes reiniciar cuantas veces quieras.</p></div><div className="lab-score"><strong>{completedLessons.length}/{lessons.length}</strong><span>misiones<br />completadas</span></div></header>

      <div className="lab-workspace">
        <aside className="mission-list">
          <div className="mission-list-title"><span>MISIONES</span><small>elige un escenario</small></div>
          {lessons.map((lesson) => {
            const active = lesson.id === activeLesson.id
            const done = completedLessons.includes(lesson.id)
            return <button className={active ? 'active' : ''} onClick={() => chooseLesson(lesson)} type="button" key={lesson.id}><span className={done ? 'done' : ''}>{done ? <Icon name="check" size={15} /> : lesson.number}</span><div><strong>{lesson.shortTitle}</strong><small>{lesson.level} · {lesson.duration}</small></div><Icon name="arrow" size={15} /></button>
          })}
          <a href={lessonHref(activeLesson.id)}><Icon name="book" size={16} />Leer la guía de esta misión</a>
        </aside>

        <section className="lab-console">
          <div className="mission-brief"><div><span>{activeLesson.number} · {activeLesson.category.toUpperCase()}</span><h2>{activeLesson.title}</h2><p>{activeLesson.scenario}</p></div><div><small>OBJETIVO</small><strong>{activeLesson.objective}</strong></div></div>
          <RepoMap session={session} />
          <div className="steps-row">{activeLesson.steps.map((step, index) => <div className={index < session.currentStep || session.completed ? 'done' : index === session.currentStep ? 'current' : ''} key={step.command}><span>{index < session.currentStep || session.completed ? <Icon name="check" size={14} /> : index + 1}</span><code>{step.command}</code></div>)}</div>
          <div className="terminal-window">
            <header><span><i /><i /><i />gitpath / {activeLesson.id}</span><button onClick={resetSession} type="button"><Icon name="refresh" size={14} />Reiniciar</button></header>
            <div className="terminal-transcript" aria-live="polite">
              {session.transcript.map((entry, index) => <div className={`terminal-entry ${entry.type}`} key={`${entry.type}-${index}`}>{entry.type === 'command' ? <code><b>$</b> {entry.text}</code> : <p>{entry.text}</p>}</div>)}
            </div>
            <form onSubmit={execute}><span>$</span><input aria-label="Comando de Git" autoCapitalize="none" autoComplete="off" disabled={session.completed} onChange={(event) => setCommand(event.target.value)} placeholder={session.completed ? 'Misión completada' : 'escribe un comando...'} spellCheck={false} value={command} /><button disabled={session.completed} type="submit">Ejecutar <Icon name="arrow" size={16} /></button></form>
          </div>
          <div className={`lab-feedback ${session.feedback.tone}`}><span>{session.feedback.tone === 'success' ? <Icon name="check" size={17} /> : <Icon name="spark" size={17} />}</span><p>{session.feedback.text}</p>{suggested && <button onClick={() => setCommand(suggested)} type="button">Usar pista: <code>{suggested}</code></button>}</div>
        </section>
      </div>
    </div>
  )
}

const relatedSlides: Record<string, string> = {
  'first-commit': 'staging',
  'safe-branch': 'ramas',
  'revert-release': 'deshacer',
  'resolve-conflict': 'grafo',
  'recover-reflog': 'reflog',
}

function LessonGuidePage({ lesson, completed }: { lesson: Lesson; completed: boolean }) {
  const relatedSlide = courseSlides.find((slide) => slide.id === relatedSlides[lesson.id]) ?? courseSlides[0]
  return (
    <div className="guide-page page-width">
      <header className="guide-hero"><div><span className="eyebrow">GUÍA {lesson.number} · {lesson.category.toUpperCase()}</span><h1>{lesson.title}.</h1><p>{lesson.detail}</p><div><a className="button primary" href={labHref(lesson.id)}><Icon name="terminal" size={18} />Practicar misión</a><a className="button quiet" href={courseHref(relatedSlide.id)}>Ver modelo visual <Icon name="arrow" size={18} /></a></div></div><div className="guide-visual"><CourseVisual kind={relatedSlide.visual} compact /></div></header>
      <section className="guide-content"><article><span className="eyebrow">EL ESCENARIO</span><h2>{lesson.scenario}</h2><p><strong>Tu objetivo:</strong> {lesson.objective}</p><div>{lesson.concepts.map((concept) => <span key={concept}>{concept}</span>)}</div></article><article><span className="eyebrow">PASO A PASO</span>{lesson.steps.map((step, index) => <div className="guide-step" key={step.command}><span>{String(index + 1).padStart(2, '0')}</span><div><code>$ {step.command}</code><p>{step.hint}</p></div></div>)}<p className={completed ? 'guide-status done' : 'guide-status'}>{completed ? '✓ Misión completada' : `${lesson.duration} · lista para practicar`}</p></article></section>
    </div>
  )
}

function ProgressPage({ viewedSlides, completedLessons, onReset }: { viewedSlides: string[]; completedLessons: string[]; onReset: () => void }) {
  const coursePercent = Math.round((viewedSlides.length / courseSlides.length) * 100)
  const labPercent = Math.round((completedLessons.length / lessons.length) * 100)
  return (
    <div className="progress-page page-width">
      <header><span className="eyebrow">MI PROGRESO</span><h1>Aprender sin prisa también cuenta.</h1><p>Todo se guarda únicamente en este navegador. Puedes continuar, repasar una escena o volver a empezar.</p></header>
      <section className="progress-cards">
        <article><div className="big-progress"><strong>{coursePercent}%</strong><span>curso visual</span></div><div><span>APRENDER</span><h2>{viewedSlides.length} de {courseSlides.length} escenas vistas</h2><div className="bar"><i style={{ width: `${coursePercent}%` }} /></div><a href={courseHref(courseSlides.find((slide) => !viewedSlides.includes(slide.id))?.id ?? 'modelo-mental')}>Continuar curso <Icon name="arrow" size={17} /></a></div></article>
        <article><div className="big-progress practice"><strong>{labPercent}%</strong><span>laboratorio</span></div><div><span>PRACTICAR</span><h2>{completedLessons.length} de {lessons.length} misiones resueltas</h2><div className="bar"><i style={{ width: `${labPercent}%` }} /></div><a href={labHref(lessons.find((lesson) => !completedLessons.includes(lesson.id))?.id)}>Abrir laboratorio <Icon name="arrow" size={17} /></a></div></article>
      </section>
      <section className="progress-detail"><div className="section-title"><div><span className="eyebrow">ESCENAS</span><h2>Tu mapa de aprendizaje.</h2></div><button onClick={onReset} type="button"><Icon name="refresh" size={15} />Reiniciar todo</button></div><div>{courseSlides.map((slide, index) => <a className={viewedSlides.includes(slide.id) ? 'seen' : ''} href={courseHref(slide.id)} key={slide.id}><span>{viewedSlides.includes(slide.id) ? <Icon name="check" size={15} /> : String(index + 1).padStart(2, '0')}</span><div><small>{slide.chapter}</small><strong>{slide.title}</strong></div><Icon name="arrow" size={16} /></a>)}</div></section>
    </div>
  )
}

function NotFoundPage() {
  return <section className="not-found page-width"><span>404 · RUTA NO ENCONTRADA</span><h1>Este puntero no lleva a ningún commit.</h1><p>Volvamos al mapa y elige una ruta conocida.</p><a className="button primary" href="/">Volver al inicio <Icon name="arrow" size={18} /></a></section>
}

function App() {
  const path = currentPath()
  const slideIds = new Set(courseSlides.map((slide) => slide.id))
  const lessonIds = new Set(lessons.map((lesson) => lesson.id))
  const [viewedSlides, setViewedSlides] = useState<string[]>(() => readStoredList(COURSE_PROGRESS_KEY, slideIds))
  const [completedLessons, setCompletedLessons] = useState<string[]>(() => readStoredList(PRACTICE_PROGRESS_KEY, lessonIds))

  useEffect(() => window.localStorage.setItem(COURSE_PROGRESS_KEY, JSON.stringify(viewedSlides)), [viewedSlides])
  useEffect(() => window.localStorage.setItem(PRACTICE_PROGRESS_KEY, JSON.stringify(completedLessons)), [completedLessons])

  const markViewed = (slideId: string) => setViewedSlides((current) => current.includes(slideId) ? current : [...current, slideId])
  const markCompleted = (lessonId: string) => setCompletedLessons((current) => current.includes(lessonId) ? current : [...current, lessonId])
  const resetProgress = () => {
    if (window.confirm('¿Quieres reiniciar el curso y las misiones guardadas en este navegador?')) {
      setViewedSlides([])
      setCompletedLessons([])
    }
  }

  const lesson = path.startsWith('/ruta/') ? lessons.find((item) => item.id === path.slice('/ruta/'.length)) : undefined
  let page: ReactNode
  let minimal = false

  if (path === '/') page = <HomePage completedLessons={completedLessons} viewedSlides={viewedSlides} />
  else if (path === '/aprender' || path === '/fundamentos') {
    page = <CoursePage initialSlideId={path === '/fundamentos' ? 'commit' : undefined} onView={markViewed} viewedSlides={viewedSlides} />
    minimal = true
  } else if (path === '/ramas-y-prs') {
    page = <CoursePage initialSlideId="ramas" onView={markViewed} viewedSlides={viewedSlides} />
    minimal = true
  } else if (path === '/laboratorio') page = <LabPage completedLessons={completedLessons} onComplete={markCompleted} />
  else if (path === '/progreso') page = <ProgressPage completedLessons={completedLessons} onReset={resetProgress} viewedSlides={viewedSlides} />
  else if (lesson) page = <LessonGuidePage completed={completedLessons.includes(lesson.id)} lesson={lesson} />
  else page = <NotFoundPage />

  return <AppShell learnedCount={viewedSlides.length} minimal={minimal} path={path}>{page}</AppShell>
}

export default App
