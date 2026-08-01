import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import { failureCases, lessons, type Lesson, type LessonLevel } from './data/lessons'
import { createSession, runCommand, type SimulatorState } from './lib/git-simulator'

const PROGRESS_KEY = 'gitpath:completed-lessons:v1'

type IconName =
  | 'alert'
  | 'arrow'
  | 'book'
  | 'branch'
  | 'check'
  | 'code'
  | 'commit'
  | 'download'
  | 'refresh'
  | 'shield'
  | 'spark'
  | 'target'
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
    alert: (
      <>
        <path d="M12 3 2.7 20.2a1.2 1.2 0 0 0 1.06 1.8h16.48a1.2 1.2 0 0 0 1.06-1.8L12 3Z" />
        <path d="M12 9v4.5M12 17.25h.01" />
      </>
    ),
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    book: (
      <>
        <path d="M4 5.75A2.75 2.75 0 0 1 6.75 3H11v16H6.75A2.75 2.75 0 0 0 4 21.75V5.75Z" />
        <path d="M20 5.75A2.75 2.75 0 0 0 17.25 3H13v16h4.25A2.75 2.75 0 0 1 20 21.75V5.75Z" />
      </>
    ),
    branch: (
      <>
        <circle cx="6" cy="5" r="2.25" />
        <circle cx="18" cy="19" r="2.25" />
        <circle cx="6" cy="19" r="2.25" />
        <path d="M6 7.25v9.5M8.25 19H15.75a2.25 2.25 0 0 0 2.25-2.25V7" />
      </>
    ),
    check: <path d="m5 12 4.3 4.3L19 6.7" />,
    code: (
      <>
        <path d="m8.5 8-4 4 4 4M15.5 8l4 4-4 4M13.5 5l-3 14" />
      </>
    ),
    commit: (
      <>
        <path d="M5 12h3M16 12h3M8 12h8" />
        <circle cx="12" cy="12" r="3.25" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12M7.5 10.5 12 15l4.5-4.5M5 21h14" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 11a8 8 0 0 0-14.7-4.4L3 9" />
        <path d="M3 4v5h5M4 13a8 8 0 0 0 14.7 4.4L21 15" />
        <path d="M21 20v-5h-5" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 19 6v5.2c0 4.3-2.7 7.8-7 9.8-4.3-2-7-5.5-7-9.8V6l7-3Z" />
        <path d="m8.75 12 2.1 2.1 4.35-4.35" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3 1.65 5.35L19 10l-5.35 1.65L12 17l-1.65-5.35L5 10l5.35-1.65L12 3Z" />
        <path d="m19 16 .65 2.35L22 19l-2.35.65L19 22l-.65-2.35L16 19l2.35-.65L19 16Z" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <circle cx="12" cy="12" r="4" />
        <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" />
      </>
    ),
    terminal: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2.2" />
        <path d="m7 9 3 3-3 3M12.5 15H17" />
      </>
    ),
  }

  return <svg {...common}>{paths[name]}</svg>
}

function Pill({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'success' | 'warm' }) {
  return <span className={'pill pill-' + tone}>{children}</span>
}

function normalizePath(pathname: string) {
  return pathname.replace(/\/+$/, '') || '/'
}

function getCurrentPath() {
  if (typeof window === 'undefined') return '/'
  return normalizePath(window.location.pathname)
}

function lessonHref(lessonId: string) {
  return '/ruta/' + lessonId
}

function labHref(lessonId?: string) {
  return lessonId ? '/laboratorio?lesson=' + encodeURIComponent(lessonId) : '/laboratorio'
}

function validCompletedLessons(candidate: unknown): string[] {
  if (!Array.isArray(candidate)) return []
  const allowedIds = new Set(lessons.map((lesson) => lesson.id))
  return [
    ...new Set(
      candidate.filter(
        (lessonId): lessonId is string => typeof lessonId === 'string' && allowedIds.has(lessonId),
      ),
    ),
  ]
}

function readCompletedLessons(): string[] {
  if (typeof window === 'undefined') return []

  try {
    return validCompletedLessons(JSON.parse(window.localStorage.getItem(PROGRESS_KEY) ?? '[]'))
  } catch {
    return []
  }
}

function levelTone(level: LessonLevel) {
  if (level === 'Rescate') return 'warm'
  if (level === 'Intermedio') return 'success'
  return 'default'
}

function getNextLesson(completedLessons: string[], afterLessonId?: string) {
  const remaining = lessons.filter((lesson) => !completedLessons.includes(lesson.id))
  if (!afterLessonId) return remaining[0] ?? lessons[0]

  const afterIndex = lessons.findIndex((lesson) => lesson.id === afterLessonId)
  return (
    lessons.slice(afterIndex + 1).find((lesson) => !completedLessons.includes(lesson.id)) ??
    remaining[0] ??
    lessons[0]
  )
}

function getLessonFromPath(path: string) {
  if (!path.startsWith('/ruta/')) return undefined
  return lessons.find((lesson) => lesson.id === path.slice('/ruta/'.length))
}

function Navigation({ path }: { path: string }) {
  const navItems = [
    { href: '/fundamentos', label: 'Fundamentos' },
    { href: '/ramas-y-prs', label: 'Ramas y PRs' },
    { href: '/laboratorio', label: 'Laboratorio' },
    { href: '/progreso', label: 'Progreso' },
  ]
  const renderNavItem = (item: { href: string; label: string }) => {
    const isActive = path === item.href || path.startsWith(item.href + '/')
    return <a aria-current={isActive ? 'page' : undefined} className={isActive ? 'nav-link-active' : undefined} href={item.href} key={item.href}>{item.label}</a>
  }

  return (
    <nav className="nav shell" aria-label="Navegación principal">
      <a className="brand" href="/" aria-label="Ir al inicio de GitPath">
        <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
        <span>GitPath<span className="brand-dot">.</span></span>
      </a>

      <div className="nav-links">
        {navItems.map(renderNavItem)}
      </div>

      <a className="nav-cta" href="/laboratorio">Practicar <Icon name="arrow" size={17} /></a>

      <div className="nav-mobile-links" aria-label="Rutas de aprendizaje">
        {navItems.map(renderNavItem)}
      </div>
    </nav>
  )
}

function AppShell({
  children,
  path,
  completedCount,
}: {
  children: ReactNode
  path: string
  completedCount: number
}) {
  return (
    <main>
      <Navigation path={path} />
      {children}
      <footer className="site-footer shell">
        <div>
          <a className="brand footer-brand" href="/">GitPath<span className="brand-dot">.</span></a>
          <p>Aprende Git practicando decisiones reales, una ruta a la vez.</p>
        </div>
        <div className="footer-links">
          <a href="/fundamentos">Fundamentos</a>
          <a href="/ramas-y-prs">Ramas y PRs</a>
          <a href="/laboratorio">Laboratorio</a>
          <a href="/progreso">Progreso: {completedCount}/{lessons.length}</a>
          <a href="https://github.com/RenzoAL7/Gitpath" rel="noreferrer" target="_blank">Código en GitHub ↗</a>
        </div>
      </footer>
    </main>
  )
}

function SectionIntro({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: ReactNode
  description: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="page-hero shell">
      <div>
        <Pill><span className="pill-dot" />{eyebrow}</Pill>
        <h1>{title}</h1>
        <p>{description}</p>
        {action}
      </div>
      <div className="page-note" aria-label="Cómo funciona GitPath">
        <div className="page-note-topline"><span>NOTA DE CAMPO</span><span>LOCAL · SEGURO</span></div>
        <p className="page-note-quote">“Mira el estado antes de tocar la historia.”</p>
        <div className="page-note-flow" aria-hidden="true">
          <span><code>working tree</code><b>→</b></span>
          <span><code>staging</code><b>→</b></span>
          <span><code>commit</code></span>
        </div>
        <div className="page-note-footer"><span className="status-dot" /> progreso guardado en este navegador</div>
      </div>
    </section>
  )
}

function ProgressMeter({ completedLessons, compact = false }: { completedLessons: string[]; compact?: boolean }) {
  const percentage = Math.round((completedLessons.length / lessons.length) * 100)
  return (
    <div className={compact ? 'progress-meter progress-meter-compact' : 'progress-meter'}>
      <div className="progress-meter-head">
        <span>{completedLessons.length} de {lessons.length} misiones completadas</span>
        <strong>{percentage}%</strong>
      </div>
      <div className="progress-track" aria-label={percentage + '% de progreso'}>
        <span style={{ width: percentage + '%' }} />
      </div>
    </div>
  )
}

function LessonCard({
  lesson,
  completed,
  featured = false,
}: {
  lesson: Lesson
  completed: boolean
  featured?: boolean
}) {
  return (
    <article className={'course-card ' + (featured ? 'course-card-featured' : '')}>
      <div className="course-card-top">
        <Pill tone={completed ? 'success' : levelTone(lesson.level)}>
          {completed ? <><Icon name="check" size={14} /> Completada</> : lesson.level}
        </Pill>
        <span>{lesson.duration}</span>
      </div>
      <p className="course-number">{lesson.number}</p>
      <h3>{lesson.title}</h3>
      <p>{lesson.scenario}</p>
      <div className="course-card-footer">
        <a href={lessonHref(lesson.id)}>Ver guía <Icon name="arrow" size={17} /></a>
        <a className="text-action" href={labHref(lesson.id)}>Practicar</a>
      </div>
    </article>
  )
}

function BranchMap({ activeStep = 1 }: { activeStep?: number }) {
  return (
    <div className="hero-branch-map" aria-label="Flujo visual de una rama de trabajo">
      <div className="hero-branch-line" />
      {['main', 'cambio', 'pull request'].map((name, index) => (
        <div className={'hero-branch-node ' + (index === activeStep ? 'hero-branch-node-active' : '')} key={name}>
          <span />
          <small>{name}</small>
        </div>
      ))}
    </div>
  )
}

function HomePage({ completedLessons }: { completedLessons: string[] }) {
  const nextLesson = getNextLesson(completedLessons)
  return (
    <>
      <section className="hero shell">
        <div className="hero-copy">
          <Pill><span className="pill-dot" />RUTA PRÁCTICA · GIT DESDE CERO</Pill>
          <h1>Cuando Git se complica, vuelve al estado del repo<span className="accent">.</span></h1>
          <p>GitPath es un laboratorio para practicar las decisiones que aparecen cuando el repositorio ya tiene historia: mirar, separar, guardar y revisar.</p>
          <div className="hero-actions">
            <a className="button button-primary" href="/fundamentos">Ver la ruta <Icon name="arrow" size={18} /></a>
            <a className="button button-quiet" href={labHref(nextLesson.id)}>Continuar donde lo dejaste <Icon name="arrow" size={18} /></a>
          </div>
          <div className="hero-meta">
            <span><strong>{lessons.length}</strong> misiones guiadas</span>
            <span className="meta-divider" />
            <span><strong>sin cuentas</strong> ni repos reales</span>
            <span className="meta-divider" />
            <span><strong>progreso</strong> local</span>
          </div>
        </div>

        <div className="hero-card">
          <div className="card-header"><span>siguiente misión</span><span>{nextLesson.duration}</span></div>
          <h2>{nextLesson.title}</h2>
          <p>{nextLesson.detail}</p>
          <BranchMap activeStep={completedLessons.includes(nextLesson.id) ? 2 : 1} />
          <div className="terminal-preview">
            <div className="terminal-bar"><span /><span /><span /><code>gitpath / starter</code></div>
            <pre><span>$</span> git status{'\n'}Lee antes de tocar{'\n'}<span>$</span> git add .{'\n'}<span>$</span> git commit -m <i>"mi primer paso"</i><b /></pre>
          </div>
          <a href={labHref(nextLesson.id)}>Abrir misión <Icon name="arrow" size={17} /></a>
        </div>
      </section>

      <section className="feature-strip shell" aria-label="Principios de GitPath">
        <div><Icon name="target" size={22} /><span>Mira primero<br /><strong>decide después</strong></span></div>
        <div><Icon name="terminal" size={22} /><span>Un comando por vez<br /><strong>con feedback claro</strong></span></div>
        <div><Icon name="shield" size={22} /><span>Los errores también<br /><strong>dejan pistas</strong></span></div>
      </section>

      <section className="learning-overview shell">
        <div className="section-heading">
          <div><Pill tone="success">LA RUTA</Pill><h2>Del cambio local al pull request.</h2></div>
          <p>No memorizas comandos aislados: practicas el orden y el porqué de cada decisión.</p>
        </div>
        <div className="learning-map">
          <a href="/fundamentos" className="map-step"><span>01</span><Icon name="commit" size={22} /><h3>Fundamentos</h3><p>Entiende estado, staging y commits pequeños.</p><small>Explorar <Icon name="arrow" size={15} /></small></a>
          <a href="/ramas-y-prs" className="map-step"><span>02</span><Icon name="branch" size={22} /><h3>Ramas y PRs</h3><p>Trabaja sin romper main y revisa cambios con contexto.</p><small>Explorar <Icon name="arrow" size={15} /></small></a>
          <a href="/laboratorio" className="map-step"><span>03</span><Icon name="terminal" size={22} /><h3>Laboratorio</h3><p>Escribe comandos y recibe guía mientras avanzas.</p><small>Practicar <Icon name="arrow" size={15} /></small></a>
        </div>
      </section>

      <section className="route-section shell">
        <div className="section-heading">
          <div><Pill tone="success">MISIONES</Pill><h2>Tu ruta, visible desde el primer día.</h2></div>
          <ProgressMeter completedLessons={completedLessons} compact />
        </div>
        <div className="course-grid">
          {lessons.slice(0, 3).map((lesson, index) => (
            <LessonCard completed={completedLessons.includes(lesson.id)} featured={index === 0} lesson={lesson} key={lesson.id} />
          ))}
        </div>
        <a className="section-link" href="/progreso">Ver mi progreso completo <Icon name="arrow" size={18} /></a>
      </section>

      <section className="failure-section shell">
        <div className="section-heading">
          <div><Pill tone="warm"><Icon name="shield" size={14} /> APRENDE SEGURO</Pill><h2>Equivocarte también es parte de la ruta.</h2></div>
          <p>Antes de que un error llegue a tu repositorio, entiendes su señal y una salida segura.</p>
        </div>
        <div className="failure-grid">
          {failureCases.map((failure) => (
            <article className={'failure-card failure-' + failure.tone} key={failure.title}>
              <Icon name="alert" size={20} /><h3>{failure.title}</h3><p>{failure.symptom}</p><code>{failure.rescue}</code>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}

function FoundationsPage({ completedLessons }: { completedLessons: string[] }) {
  const firstCommit = lessons.find((lesson) => lesson.id === 'first-commit') ?? lessons[0]
  const safeBranch = lessons.find((lesson) => lesson.id === 'safe-branch') ?? lessons[1]
  return (
    <>
      <SectionIntro
        eyebrow="RUTA 01 · FUNDAMENTOS"
        title={<>Haz visible el cambio antes de compartirlo<span className="accent">.</span></>}
        description="Git no empieza con un comando: empieza entendiendo qué cambió, qué quieres guardar y qué mensaje permitirá recordar por qué lo hiciste."
        action={<a className="button button-primary page-hero-action" href={labHref(firstCommit.id)}>Practicar primer commit <Icon name="arrow" size={18} /></a>}
      />

      <section className="concept-section shell">
        <div className="section-heading">
          <div><Pill tone="success">MODELO MENTAL</Pill><h2>Un cambio recorre tres estados.</h2></div>
          <p>La clave es no intentar hacer todo a la vez. Cada estado responde una pregunta distinta.</p>
        </div>
        <div className="state-flow">
          <article><span>01</span><Icon name="code" size={24} /><h3>Directorio de trabajo</h3><p>¿Qué cambiaste realmente?</p><code>git status</code></article>
          <div className="state-arrow"><Icon name="arrow" size={20} /></div>
          <article><span>02</span><Icon name="download" size={24} /><h3>Staging</h3><p>¿Qué parte quieres incluir?</p><code>git add .</code></article>
          <div className="state-arrow"><Icon name="arrow" size={20} /></div>
          <article><span>03</span><Icon name="commit" size={24} /><h3>Commit</h3><p>¿Qué decisión queda registrada?</p><code>git commit -m "mensaje"</code></article>
        </div>
      </section>

      <section className="route-section shell">
        <div className="section-heading">
          <div><Pill>PRÁCTICA GUIADA</Pill><h2>Dos misiones para empezar con contexto.</h2></div>
          <p>Completa una antes de pasar a la siguiente. El progreso se guarda en este navegador.</p>
        </div>
        <div className="course-grid two-columns">
          <LessonCard lesson={firstCommit} completed={completedLessons.includes(firstCommit.id)} featured />
          <LessonCard lesson={safeBranch} completed={completedLessons.includes(safeBranch.id)} />
        </div>
      </section>

      <section className="checklist-section shell">
        <div><Pill tone="warm">ANTES DE COMMIT</Pill><h2>La mini lista que evita commits confusos.</h2></div>
        <ol>
          <li><span>1</span><p><strong>Lee el estado.</strong> No añadas archivos que no reconoces.</p></li>
          <li><span>2</span><p><strong>Haz un cambio con una sola intención.</strong> Un commit no debería mezclar una corrección y una función nueva.</p></li>
          <li><span>3</span><p><strong>Describe la decisión.</strong> El mensaje explica el porqué, no repite el nombre del archivo.</p></li>
        </ol>
      </section>
    </>
  )
}

function BranchesAndPullRequestsPage({ completedLessons }: { completedLessons: string[] }) {
  const branchLesson = lessons.find((lesson) => lesson.id === 'safe-branch') ?? lessons[1]
  const conflictLesson = lessons.find((lesson) => lesson.id === 'resolve-conflict') ?? lessons[3]
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const checklist = [
    'Entiendo qué cambia esta rama.',
    'Probé la experiencia antes de abrir el PR.',
    'El título del PR explica el resultado esperado.',
    'No incluí secretos, builds locales ni archivos ajenos.',
  ]

  return (
    <>
      <SectionIntro
        eyebrow="RUTA 02 · COLABORACIÓN"
        title={<>Tu rama protege el trabajo; el PR protege la decisión<span className="accent">.</span></>}
        description="Main se mantiene estable. Cada cambio vive primero en una rama con un propósito claro, luego se revisa como pull request antes de fusionarse."
        action={<a className="button button-primary page-hero-action" href={labHref(branchLesson.id)}>Crear una rama segura <Icon name="arrow" size={18} /></a>}
      />

      <section className="workflow-section shell">
        <div className="section-heading">
          <div><Pill tone="success">FLUJO DE EQUIPO</Pill><h2>Una secuencia que puedes repetir.</h2></div>
          <p>El objetivo no es usar más comandos; es llegar a main con un cambio entendible, probado y reversible.</p>
        </div>
        <ol className="workflow-flow">
          <li><span>01</span><div><Icon name="branch" size={20} /><h3>Crea una rama</h3><p><code>git switch -c feat/mi-cambio</code></p></div></li>
          <li><span>02</span><div><Icon name="commit" size={20} /><h3>Commits pequeños</h3><p>Un mensaje por intención.</p></div></li>
          <li><span>03</span><div><Icon name="book" size={20} /><h3>Abre un PR</h3><p>Cuenta qué cambia y cómo probarlo.</p></div></li>
          <li><span>04</span><div><Icon name="check" size={20} /><h3>Revisa y fusiona</h3><p>Protege main con validaciones.</p></div></li>
        </ol>
      </section>

      <section className="route-section shell">
        <div className="section-heading">
          <div><Pill>ENTRENAMIENTO</Pill><h2>Trabaja seguro antes de colaborar.</h2></div>
          <ProgressMeter completedLessons={completedLessons} compact />
        </div>
        <div className="course-grid two-columns">
          <LessonCard lesson={branchLesson} completed={completedLessons.includes(branchLesson.id)} featured />
          <LessonCard lesson={conflictLesson} completed={completedLessons.includes(conflictLesson.id)} />
        </div>
      </section>

      <section className="pr-checklist shell">
        <div><Pill tone="warm">CHECKLIST INTERACTIVA</Pill><h2>Antes de abrir un pull request.</h2><p>Marca esta lista como si fueras a pedir revisión hoy.</p></div>
        <div className="checklist-items">
          {checklist.map((item) => (
            <label className={checked[item] ? 'checked' : ''} key={item}>
              <input checked={Boolean(checked[item])} onChange={() => setChecked((current) => ({ ...current, [item]: !current[item] }))} type="checkbox" />
              <span><Icon name="check" size={16} /></span>
              {item}
            </label>
          ))}
        </div>
      </section>
    </>
  )
}

function LessonDetailPage({ lesson, completedLessons }: { lesson: Lesson; completedLessons: string[] }) {
  const completed = completedLessons.includes(lesson.id)
  const nextLesson = getNextLesson(completedLessons, lesson.id)
  return (
    <>
      <SectionIntro
        eyebrow={lesson.number + ' · ' + lesson.category.toUpperCase()}
        title={<>{lesson.title}<span className="accent">.</span></>}
        description={lesson.detail}
        action={<a className="button button-primary page-hero-action" href={labHref(lesson.id)}>Abrir laboratorio <Icon name="terminal" size={18} /></a>}
      />

      <section className="lesson-detail shell">
        <article className="lesson-objective">
          <Pill tone={completed ? 'success' : levelTone(lesson.level)}>{completed ? <><Icon name="check" size={14} /> Misión completada</> : lesson.level}</Pill>
          <h2>Objetivo</h2><p>{lesson.objective}</p>
          <dl><div><dt>Duración</dt><dd>{lesson.duration}</dd></div><div><dt>Escenario</dt><dd>{lesson.scenario}</dd></div></dl>
        </article>
        <article className="lesson-concepts">
          <Pill>CONCEPTOS</Pill><h2>Antes de escribir comandos.</h2>
          <ul>{lesson.concepts.map((concept) => <li key={concept}><Icon name="spark" size={16} />{concept}</li>)}</ul>
        </article>
      </section>

      <section className="command-guide shell">
        <div className="section-heading">
          <div><Pill tone="success">GUÍA PASO A PASO</Pill><h2>Haz una cosa por vez.</h2></div>
          <p>En el laboratorio cada comando se valida y te indica qué cambió en el repositorio simulado.</p>
        </div>
        <div className="command-guide-list">
          {lesson.steps.map((step, index) => (
            <article key={step.command}><span>{String(index + 1).padStart(2, '0')}</span><div><code>$ {step.command}</code><p>{step.hint}</p></div></article>
          ))}
        </div>
        <div className="detail-actions">
          <a className="button button-primary" href={labHref(lesson.id)}>Practicar esta misión <Icon name="arrow" size={18} /></a>
          {nextLesson.id !== lesson.id && <a className="button button-quiet" href={lessonHref(nextLesson.id)}>Siguiente guía <Icon name="arrow" size={18} /></a>}
        </div>
      </section>
    </>
  )
}

function LabPage({
  completedLessons,
  onComplete,
}: {
  completedLessons: string[]
  onComplete: (lessonId: string) => void
}) {
  const lessonFromQuery = (() => {
    if (typeof window === 'undefined') return undefined
    const lessonId = new URLSearchParams(window.location.search).get('lesson')
    return lessons.find((lesson) => lesson.id === lessonId)
  })()
  const initialLesson = lessonFromQuery ?? getNextLesson(completedLessons)
  const [activeLesson, setActiveLesson] = useState<Lesson>(initialLesson)
  const [session, setSession] = useState<SimulatorState>(() => createSession(initialLesson))
  const [command, setCommand] = useState('')

  const selectLesson = (lesson: Lesson) => {
    setActiveLesson(lesson)
    setSession(createSession(lesson))
    setCommand('')
    window.history.replaceState({}, '', labHref(lesson.id))
  }

  const executeCommand = (event: FormEvent) => {
    event.preventDefault()
    if (!command.trim()) return
    const result = runCommand(session, activeLesson, command)
    setSession(result.state)
    setCommand('')
    if (result.state.completed) onComplete(activeLesson.id)
  }

  const completedWithActive = session.completed ? [...new Set([...completedLessons, activeLesson.id])] : completedLessons
  const nextLesson = getNextLesson(completedWithActive, activeLesson.id)
  const suggestedCommand = session.completed ? undefined : activeLesson.steps[session.currentStep]?.command

  return (
    <>
      <SectionIntro
        eyebrow="LABORATORIO GUIADO"
        title={<>Practica sin miedo a romper tu repositorio<span className="accent">.</span></>}
        description="Este entorno simula un repositorio y evalúa el propósito de cada comando. Puedes repetir una misión cuantas veces necesites."
      />

      <section className="lab-section shell">
        <aside className="scenario-card">
          <div className="scenario-heading"><Pill tone="success">MISIONES</Pill><span>{completedLessons.length}/{lessons.length}</span></div>
          <h2>Elige una práctica</h2><p>Empieza donde estás. Cada misión explica el contexto antes de pedir un comando.</p>
          <div className="lesson-selector">
            {lessons.map((lesson) => {
              const isActive = lesson.id === activeLesson.id
              const isComplete = completedLessons.includes(lesson.id)
              return (
                <button className={'lesson-option ' + (isActive ? 'lesson-option-active' : '')} key={lesson.id} onClick={() => selectLesson(lesson)} type="button">
                  <span>{isComplete ? <Icon name="check" size={15} /> : lesson.number}</span>
                  <div><strong>{lesson.shortTitle}</strong><small>{lesson.level} · {lesson.duration}</small></div>
                </button>
              )
            })}
          </div>
          <a className="scenario-guide-link" href={lessonHref(activeLesson.id)}>Leer la guía de esta misión <Icon name="arrow" size={16} /></a>
        </aside>

        <div className="terminal-lab">
          <div className="lab-topbar">
            <div><Pill>{activeLesson.number} · {activeLesson.level}</Pill><h2>{activeLesson.title}</h2></div>
            <span className={session.completed ? 'lab-status lab-status-success' : 'lab-status'}>{session.completed ? 'Completada' : 'Paso ' + Math.min(session.currentStep + 1, activeLesson.steps.length) + '/' + activeLesson.steps.length}</span>
          </div>
          <div className="scenario-copy"><h3>{activeLesson.scenario}</h3><p>{activeLesson.objective}</p></div>
          <div className="command-steps">
            {activeLesson.steps.map((step, index) => (
              <div className={'command-step ' + (index < session.currentStep ? 'command-step-done ' : '') + (index === session.currentStep && !session.completed ? 'command-step-current' : '')} key={step.command}>
                <span>{index < session.currentStep || session.completed ? <Icon name="check" size={15} /> : index + 1}</span>
                <div><code>{step.command}</code><p>{step.hint}</p></div>
              </div>
            ))}
          </div>
          {!session.completed && suggestedCommand && (
            <div className="command-starter">
              <div><strong>¿Quieres una base?</strong><span>Coloca el comando del paso actual y edítalo si lo necesitas.</span></div>
              <button onClick={() => setCommand(suggestedCommand)} type="button">Usar comando sugerido <Icon name="arrow" size={15} /></button>
            </div>
          )}
          <div className="terminal-window" aria-live="polite">
            <div className="terminal-bar"><span /><span /><span /><code>gitpath / {activeLesson.id}</code></div>
            <div className="terminal-output">
              {session.transcript.map((entry, index) => (
                <div className="terminal-entry" key={entry.type + '-' + index}>
                  {entry.type === 'command' ? (
                    <code><span>$</span> {entry.text}</code>
                  ) : (
                    <p className={entry.type === 'error' ? 'terminal-error' : entry.type === 'hint' ? 'terminal-muted' : 'terminal-success'}>{entry.text}</p>
                  )}
                </div>
              ))}
            </div>
            <form className="terminal-input" onSubmit={executeCommand}>
              <span>$</span>
              <input aria-label="Comando de Git" autoCapitalize="none" autoComplete="off" disabled={session.completed} onChange={(event) => setCommand(event.target.value)} placeholder={session.completed ? 'Misión completada' : activeLesson.steps[session.currentStep]?.command} spellCheck={false} value={command} />
              <button aria-label="Ejecutar comando" disabled={session.completed} type="submit"><Icon name="arrow" size={18} /></button>
            </form>
          </div>
          {session.completed && (
            <div className="completion-card">
              <div><Icon name="check" size={21} /></div>
              <div><strong>Misión completada.</strong><p>{activeLesson.success}</p></div>
              {nextLesson.id !== activeLesson.id && <a href={labHref(nextLesson.id)}>Siguiente <Icon name="arrow" size={17} /></a>}
            </div>
          )}
        </div>
      </section>
    </>
  )
}

function ProgressPage({ completedLessons, onReset }: { completedLessons: string[]; onReset: () => void }) {
  const percentage = Math.round((completedLessons.length / lessons.length) * 100)
  return (
    <>
      <SectionIntro
        eyebrow="TU PROGRESO"
        title={<>Una ruta que se adapta a tu ritmo<span className="accent">.</span></>}
        description="Tu avance se guarda de forma local en este navegador. Vuelve al laboratorio para retomar la siguiente misión pendiente."
        action={<a className="button button-primary page-hero-action" href={labHref(getNextLesson(completedLessons).id)}>Continuar mi ruta <Icon name="arrow" size={18} /></a>}
      />
      <section className="progress-summary shell">
        <div className="progress-stat"><strong>{completedLessons.length}</strong><span>misiones completadas</span></div>
        <ProgressMeter completedLessons={completedLessons} />
        <div className="progress-stat"><strong>{percentage}%</strong><span>de la ruta práctica</span></div>
      </section>
      <section className="progress-list shell">
        <div className="section-heading">
          <div><Pill tone="success">MISIONES</Pill><h2>Tu tablero de aprendizaje.</h2></div>
          {completedLessons.length > 0 && <button className="reset-progress" onClick={onReset} type="button"><Icon name="refresh" size={16} /> Reiniciar progreso</button>}
        </div>
        <div className="progress-rows">
          {lessons.map((lesson) => {
            const done = completedLessons.includes(lesson.id)
            return (
              <article className={done ? 'progress-row progress-row-done' : 'progress-row'} key={lesson.id}>
                <span className="progress-row-icon">{done ? <Icon name="check" size={18} /> : lesson.number}</span>
                <div><Pill tone={done ? 'success' : levelTone(lesson.level)}>{done ? 'Completada' : lesson.level}</Pill><h3>{lesson.title}</h3><p>{lesson.category} · {lesson.duration}</p></div>
                <a href={done ? lessonHref(lesson.id) : labHref(lesson.id)}>{done ? 'Repasar' : 'Empezar'} <Icon name="arrow" size={17} /></a>
              </article>
            )
          })}
        </div>
      </section>
    </>
  )
}

function NotFoundPage() {
  return (
    <section className="not-found shell">
      <Pill tone="warm">404</Pill>
      <h1>Esta ruta todavía no existe<span className="accent">.</span></h1>
      <p>Volvamos a una misión conocida y sigamos aprendiendo desde allí.</p>
      <a className="button button-primary" href="/">Ir al inicio <Icon name="arrow" size={18} /></a>
    </section>
  )
}

function App() {
  const path = getCurrentPath()
  const [completedLessons, setCompletedLessons] = useState<string[]>(readCompletedLessons)

  useEffect(() => {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(completedLessons))
  }, [completedLessons])

  useEffect(() => {
    const syncProgress = (event: StorageEvent) => {
      if (event.key === PROGRESS_KEY) setCompletedLessons(readCompletedLessons())
    }
    window.addEventListener('storage', syncProgress)
    return () => window.removeEventListener('storage', syncProgress)
  }, [])

  const completeLesson = (lessonId: string) => {
    setCompletedLessons((current) => validCompletedLessons([...current, lessonId]))
  }

  const resetProgress = () => {
    if (window.confirm('¿Quieres reiniciar el progreso guardado en este navegador?')) setCompletedLessons([])
  }

  const lesson = getLessonFromPath(path)
  let page: ReactNode

  if (path === '/') page = <HomePage completedLessons={completedLessons} />
  else if (path === '/fundamentos') page = <FoundationsPage completedLessons={completedLessons} />
  else if (path === '/ramas-y-prs') page = <BranchesAndPullRequestsPage completedLessons={completedLessons} />
  else if (path === '/laboratorio') page = <LabPage completedLessons={completedLessons} onComplete={completeLesson} />
  else if (path === '/progreso') page = <ProgressPage completedLessons={completedLessons} onReset={resetProgress} />
  else if (lesson) page = <LessonDetailPage completedLessons={completedLessons} lesson={lesson} />
  else page = <NotFoundPage />

  return <AppShell completedCount={completedLessons.length} path={path}>{page}</AppShell>
}

export default App
