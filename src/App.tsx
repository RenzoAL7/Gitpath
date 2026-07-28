import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { failureCases, lessons, type Lesson, type LessonLevel } from './data/lessons'
import { createSession, runCommand, type SimulatorState } from './lib/git-simulator'

type IconName =
  | 'alert'
  | 'arrow'
  | 'book'
  | 'check'
  | 'code'
  | 'commit'
  | 'download'
  | 'refresh'
  | 'shield'
  | 'spark'
  | 'target'
  | 'terminal'

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  if (name === 'alert') return <svg {...common}><path d="M10.3 4.2 3.4 17a2 2 0 0 0 1.8 3h13.6a2 2 0 0 0 1.8-3L13.7 4.2a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4m0 3h.01" /></svg>
  if (name === 'arrow') return <svg {...common}><path d="M5 12h13" /><path d="m13 6 6 6-6 6" /></svg>
  if (name === 'book') return <svg {...common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" /><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" /></svg>
  if (name === 'check') return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>
  if (name === 'code') return <svg {...common}><path d="m8 9-3 3 3 3" /><path d="m16 9 3 3-3 3" /><path d="m14 5-4 14" /></svg>
  if (name === 'commit') return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M3 12h6m6 0h6" /></svg>
  if (name === 'download') return <svg {...common}><path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M5 20h14" /></svg>
  if (name === 'refresh') return <svg {...common}><path d="M20 11a8 8 0 0 0-14.7-4L3 10" /><path d="M3 5v5h5" /><path d="M4 13a8 8 0 0 0 14.7 4L21 14" /><path d="M21 19v-5h-5" /></svg>
  if (name === 'shield') return <svg {...common}><path d="M12 3 20 6v5c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V6l8-3Z" /><path d="m8.5 12 2.3 2.3 4.8-5" /></svg>
  if (name === 'spark') return <svg {...common}><path d="m12 3 1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4L12 3Z" /><path d="m19 16 .6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6L19 16Z" /></svg>
  if (name === 'target') return <svg {...common}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3" /></svg>
  return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m7 9 3 3-3 3m5 0h5" /></svg>
}

function Pill({ children, tone = 'blue' }: { children: ReactNode; tone?: 'blue' | 'green' | 'orange' }) {
  return <span className={'pill pill-' + tone}><span className="pill-dot" />{children}</span>
}

function levelTone(level: LessonLevel): 'blue' | 'green' | 'orange' {
  if (level === 'Rescate') return 'orange'
  if (level === 'Intermedio') return 'green'
  return 'blue'
}

function readCompletedLessons() {
  if (typeof window === 'undefined') return []

  try {
    const stored = JSON.parse(window.localStorage.getItem('gitpath:completed-lessons:v1') ?? '[]')
    return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

function BranchMap({ session }: { session: SimulatorState }) {
  return (
    <div className="branch-map" aria-label={'Repositorio simulado en la rama ' + session.currentBranch}>
      <div className="branch-map-topline">
        <span><span className="live-dot" /> REPOSITORIO SIMULADO</span>
        <code>HEAD → {session.head}</code>
      </div>
      <div className="branch-lanes">
        {session.branches.map((branch) => (
          <div className={'branch-lane ' + (branch === session.currentBranch ? 'lane-active' : '')} key={branch}>
            <span className="branch-name">{branch}</span>
            <div className="lane-line">
              {session.commits.map((commit, index) => (
                <span className={'commit-node ' + (index === session.commits.length - 1 ? 'commit-node-current' : '')} key={commit}>
                  <span>{commit}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="repo-state">
        <span><i className="state-icon state-clean" />{session.workingTree === 'clean' ? 'working tree limpio' : session.workingTree === 'conflict' ? 'conflicto pendiente' : 'cambios locales'}</span>
        <span><i className={'state-icon ' + (session.staged ? 'state-staged' : 'state-muted')} />{session.staged ? 'staging preparado' : 'staging vacío'}</span>
      </div>
    </div>
  )
}

function App() {
  const [completedLessons, setCompletedLessons] = useState<string[]>(readCompletedLessons)
  const [activeLessonId, setActiveLessonId] = useState(lessons[0].id)
  const [session, setSession] = useState<SimulatorState>(() => createSession(lessons[0]))
  const [command, setCommand] = useState('')

  const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId) ?? lessons[0]
  const completedCount = completedLessons.length
  const progressPercentage = Math.round((completedCount / lessons.length) * 100)

  useEffect(() => {
    window.localStorage.setItem('gitpath:completed-lessons:v1', JSON.stringify(completedLessons))
  }, [completedLessons])

  const selectLesson = (lesson: Lesson) => {
    setActiveLessonId(lesson.id)
    setSession(createSession(lesson))
    setCommand('')
    window.requestAnimationFrame(() => {
      document.getElementById('laboratorio')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const execute = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = runCommand(session, activeLesson, command)
    setSession(result.state)
    setCommand('')

    if (result.accepted && result.state.completed) {
      setCompletedLessons((current) => current.includes(activeLesson.id) ? current : [...current, activeLesson.id])
    }
  }

  const resetSession = () => {
    setSession(createSession(activeLesson))
    setCommand('')
  }

  return (
    <main>
      <nav className="nav shell" aria-label="Navegación principal">
        <a className="brand" href="#inicio" aria-label="GitPath inicio">
          <span className="brand-mark"><span /><span /><span /></span>
          <span>GitPath<span className="brand-dot">.</span></span>
        </a>
        <div className="nav-links">
          <a href="#ruta">La ruta</a>
          <a href="#laboratorio">Laboratorio</a>
          <a href="#casos">Casos reales</a>
        </div>
        <a className="nav-cta" href="#ruta">Empezar <Icon name="arrow" size={16} /></a>
      </nav>

      <section className="hero shell" id="inicio">
        <div className="hero-copy">
          <Pill>RUTA 01 · FUNDAMENTOS</Pill>
          <h1>Aprende Git sin perderte en el camino<span className="accent">.</span></h1>
          <p className="hero-lede">Una ruta práctica para pasar de “no sé por dónde empezar” a resolver conflictos, rescatar cambios y colaborar con confianza.</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#ruta">Comenzar la ruta <Icon name="arrow" size={17} /></a>
            <a className="text-link" href="#laboratorio">Probar el laboratorio <Icon name="arrow" size={16} /></a>
          </div>
          <div className="hero-meta">
            <span><strong>{lessons.length}</strong> escenarios reales</span>
            <span className="meta-separator" />
            <span><strong>100%</strong> práctico</span>
            <span className="meta-separator" />
            <span><strong>{progressPercentage}%</strong> tu progreso</span>
          </div>
          <div className="delivery-note"><span className="delivery-icon"><Icon name="shield" size={14} /></span> Deploy automático verificado con CI/CD + GitOps</div>
        </div>

        <div className="hero-card" aria-label="Vista previa de la ruta GitPath">
          <div className="card-topline"><span className="card-kicker">TU PRÓXIMO PASO</span><span className="card-time">{lessons[0].duration}</span></div>
          <h2>{lessons[0].title}</h2>
          <p>{lessons[0].objective}</p>
          <div className="branch-visual">
            <div className="branch-line" />
            <span className="node node-start" />
            <span className="node node-current" />
            <span className="node node-end" />
            <span className="branch-label label-main">main</span>
            <span className="branch-label label-feature">tu-cambio</span>
          </div>
          <div className="terminal-preview">
            <div className="terminal-bar"><span /><span /><span /><em>gitpath / starter</em></div>
            <div className="terminal-body"><span className="prompt">$</span> git status<br /><span className="terminal-muted">Cambios no preparados</span><br /><span className="prompt">$</span> git add .<br /><span className="prompt">$</span> git commit -m <span className="terminal-green">"tu primer paso"</span><span className="cursor" /></div>
          </div>
          <a className="card-link" href="#laboratorio">Abrir escenario <Icon name="arrow" size={16} /></a>
        </div>
      </section>

      <section className="feature-strip shell" id="como-funciona">
        <div className="strip-intro"><span className="eyebrow">APRENDE HACIENDO</span><h2>Situación, comando, criterio.</h2><p>GitPath convierte cada concepto en una decisión que podrías tomar durante un día real de desarrollo.</p></div>
        <div className="feature-grid">
          <article className="feature-item"><span className="feature-icon icon-yellow"><Icon name="target" /></span><h3>Entiende el contexto</h3><p>Parte de un incidente, no de una lista aislada de comandos.</p></article>
          <article className="feature-item"><span className="feature-icon icon-purple"><Icon name="terminal" /></span><h3>Practica sin miedo</h3><p>Prueba comandos en un repositorio simulado y reversible.</p></article>
          <article className="feature-item"><span className="feature-icon icon-green"><Icon name="shield" /></span><h3>Aprende a recuperarte</h3><p>Conoce riesgos, señales de alerta y caminos de rescate.</p></article>
        </div>
      </section>

      <section className="route-section shell" id="ruta">
        <div className="section-heading">
          <div><span className="eyebrow">TU PRIMERA RUTA</span><h2>De cero a tu primer PR.</h2></div>
          <div className="progress-summary"><span>{completedCount} de {lessons.length} completados</span><div className="progress-track"><span style={{ width: progressPercentage + '%' }} /></div></div>
        </div>
        <div className="steps-list">
          {lessons.map((lesson) => {
            const completed = completedLessons.includes(lesson.id)
            const active = lesson.id === activeLessonId
            return (
              <button className={'step-card ' + (active ? 'step-active' : '')} key={lesson.id} type="button" onClick={() => selectLesson(lesson)}>
                <span className="step-number">{lesson.number}</span>
                <span className="step-icon"><Icon name={lesson.level === 'Rescate' ? 'refresh' : lesson.level === 'Intermedio' ? 'shield' : 'commit'} size={19} /></span>
                <span className="step-content"><span className="step-kicker">{lesson.category} · {lesson.duration}</span><strong>{lesson.title}</strong><span>{lesson.detail}</span></span>
                <span className={'step-state ' + (completed ? 'state-ready' : active ? 'state-current' : '')}>{completed ? <><Icon name="check" size={14} />Completado</> : active ? 'En curso' : 'Empezar'}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="lab-section shell" id="laboratorio">
        <div className="section-heading lab-heading">
          <div><span className="eyebrow">LABORATORIO INTERACTIVO</span><h2>Resuelve una situación de código.</h2><p>Elige una misión, ejecuta los comandos y observa cómo cambia el repositorio.</p></div>
          <Pill tone={levelTone(activeLesson.level)}>{activeLesson.level.toUpperCase()} · {activeLesson.duration}</Pill>
        </div>
        <div className="lab-layout">
          <aside className="scenario-card">
            <div className="scenario-label"><Icon name="alert" size={15} /> INCIDENTE SIMULADO</div>
            <h3>{activeLesson.title}</h3>
            <p className="scenario-copy">{activeLesson.scenario}</p>
            <div className="objective-box"><span>OBJETIVO</span><p>{activeLesson.objective}</p></div>
            <div className="concepts"><span className="eyebrow">VAS A PRACTICAR</span><div>{activeLesson.concepts.map((concept) => <span className="concept-chip" key={concept}>{concept}</span>)}</div></div>
            <div className="command-guide"><span className="eyebrow">COMANDOS DE LA MISIÓN</span><div className="command-list">{activeLesson.steps.map((step, index) => <button type="button" className={'command-chip ' + (index === session.currentStep ? 'command-chip-active' : '')} key={step.command} onClick={() => setCommand(step.command)}><span>0{index + 1}</span><code>{step.command}</code></button>)}</div></div>
          </aside>

          <div className="terminal-lab">
            <div className="lab-toolbar"><div><span className="terminal-status-dot" /> gitpath / {activeLesson.id}</div><button type="button" className="reset-button" onClick={resetSession}><Icon name="refresh" size={14} /> Reiniciar</button></div>
            <BranchMap session={session} />
            <div className="terminal-window">
              <div className="terminal-window-bar"><span /><span /><span /><em>shell · práctica guiada</em><span className="step-counter">paso {Math.min(session.currentStep + 1, activeLesson.steps.length)} / {activeLesson.steps.length}</span></div>
              <div className="terminal-history" aria-live="polite">
                {session.transcript.map((line, index) => <div className={'terminal-line terminal-line-' + line.type} key={index}><span className="line-prefix">{line.type === 'command' ? '$' : line.type === 'error' ? '!' : line.type === 'hint' ? '↳' : '>'}</span><span>{line.text}</span></div>)}
              </div>
              <form className="command-form" onSubmit={execute}>
                <label className="sr-only" htmlFor="git-command">Comando Git</label>
                <span className="input-prefix">$</span>
                <input id="git-command" value={command} onChange={(event) => setCommand(event.target.value)} placeholder={session.completed ? 'Misión completada' : activeLesson.steps[session.currentStep].command} disabled={session.completed} autoComplete="off" />
                <button type="submit" className="execute-button" disabled={session.completed}>Ejecutar <Icon name="arrow" size={15} /></button>
              </form>
            </div>
            <div className={'lab-feedback feedback-' + session.feedback.tone} aria-live="polite"><span className="feedback-icon"><Icon name={session.feedback.tone === 'error' ? 'alert' : session.feedback.tone === 'success' ? 'check' : 'spark'} size={15} /></span><span>{session.feedback.text}</span></div>
          </div>
        </div>
      </section>

      <section className="failure-section shell" id="casos">
        <div className="failure-heading"><span className="eyebrow">CUANDO ALGO SALE MAL</span><h2>Los errores también enseñan.</h2><p>Una buena herramienta educativa no oculta el riesgo: muestra el síntoma, el daño posible y cómo volver a un estado seguro.</p></div>
        <div className="failure-grid">{failureCases.map((failure) => <article className={'failure-card failure-' + failure.tone} key={failure.title}><span className="failure-icon"><Icon name="alert" size={17} /></span><h3>{failure.title}</h3><p>{failure.symptom}</p><div><span>RIESGO</span><strong>{failure.risk}</strong></div><code>{failure.rescue}</code></article>)}</div>
      </section>

      <footer className="footer shell"><a className="brand" href="#inicio"><span className="brand-mark"><span /><span /><span /></span><span>GitPath<span className="brand-dot">.</span></span></a><span>Aprende. Practica. Avanza.</span><span className="footer-status"><span className="status-dot" />CI/CD + GitOps verificado</span></footer>
    </main>
  )
}

export default App
