import type { ReactNode } from 'react'

type IconName = 'arrow' | 'book' | 'check' | 'code' | 'commit' | 'spark' | 'terminal'

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

  if (name === 'arrow') return <svg {...common}><path d="M5 12h13" /><path d="m13 6 6 6-6 6" /></svg>
  if (name === 'book') return <svg {...common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" /><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" /></svg>
  if (name === 'check') return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>
  if (name === 'code') return <svg {...common}><path d="m8 9-3 3 3 3" /><path d="m16 9 3 3-3 3" /><path d="m14 5-4 14" /></svg>
  if (name === 'commit') return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M3 12h6m6 0h6" /></svg>
  if (name === 'terminal') return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m7 9 3 3-3 3m5 0h5" /></svg>
  return <svg {...common}><path d="m12 3 1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4L12 3Z" /><path d="m19 16 .6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6L19 16Z" /></svg>
}

function Pill({ children, tone = 'blue' }: { children: ReactNode; tone?: 'blue' | 'green' }) {
  return <span className={`pill pill-${tone}`}><span className="pill-dot" />{children}</span>
}

const steps = [
  { number: '01', title: 'Tu primer commit', detail: 'Guarda un cambio y entiende qué acaba de pasar.', state: 'Listo', icon: 'commit' as const },
  { number: '02', title: 'Crea tu rama', detail: 'Trabaja con libertad sin romper la rama principal.', state: 'Siguiente', icon: 'code' as const },
  { number: '03', title: 'Abre tu PR', detail: 'Comparte tu trabajo y recibe feedback con contexto.', state: 'Después', icon: 'book' as const },
]

function App() {
  return (
    <main>
      <nav className="nav shell" aria-label="Navegación principal">
        <a className="brand" href="#inicio" aria-label="GitPath inicio">
          <span className="brand-mark"><span /><span /><span /></span>
          <span>GitPath<span className="brand-dot">.</span></span>
        </a>
        <div className="nav-links">
          <a href="#ruta">La ruta</a>
          <a href="#como-funciona">Cómo funciona</a>
        </div>
        <a className="nav-cta" href="#ruta">Empezar <Icon name="arrow" size={16} /></a>
      </nav>

      <section className="hero shell" id="inicio">
        <div className="hero-copy">
          <Pill>RUTA 01 · FUNDAMENTOS</Pill>
          <h1>Aprende Git sin perderte en el camino. - Deploy automático verificado.<span className="accent">.</span></h1>
          <p className="hero-lede">Una ruta práctica para pasar de “no sé por dónde empezar” a trabajar con ramas, commits y pull requests con confianza.</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#ruta">Comenzar la ruta <Icon name="arrow" size={17} /></a>
            <a className="text-link" href="#como-funciona">Ver cómo funciona <Icon name="arrow" size={16} /></a>
          </div>
          <div className="hero-meta">
            <span><strong>3</strong> pasos para comenzar</span>
            <span className="meta-separator" />
            <span><strong>100%</strong> práctico</span>
          </div>
        </div>

        <div className="hero-card" aria-label="Vista previa de la ruta GitPath">
          <div className="card-topline"><span className="card-kicker">TU PRÓXIMO PASO</span><span className="card-time">5 min</span></div>
          <h2>Tu primer commit</h2>
          <p>Un cambio pequeño es suficiente para empezar.</p>
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
            <div className="terminal-body"><span className="prompt">$</span> git status<br /><span className="terminal-muted">En tu rama main</span><br /><span className="prompt">$</span> git add .<br /><span className="prompt">$</span> git commit -m <span className="terminal-green">"mi primer paso"</span><span className="cursor" /></div>
          </div>
          <a className="card-link" href="#ruta">Ver la lección <Icon name="arrow" size={16} /></a>
        </div>
      </section>

      <section className="feature-strip shell" id="como-funciona">
        <div className="strip-intro"><span className="eyebrow">APRENDE HACIENDO</span><h2>Una ruta, cada paso con sentido.</h2></div>
        <div className="feature-grid">
          <article className="feature-item"><span className="feature-icon icon-yellow"><Icon name="book" /></span><h3>Entiende</h3><p>Explicaciones cortas antes de cada comando.</p></article>
          <article className="feature-item"><span className="feature-icon icon-purple"><Icon name="terminal" /></span><h3>Practica</h3><p>Prueba el flujo en un espacio seguro y guiado.</p></article>
          <article className="feature-item"><span className="feature-icon icon-green"><Icon name="spark" /></span><h3>Avanza</h3><p>Convierte lo aprendido en hábitos reales de equipo.</p></article>
        </div>
      </section>

      <section className="route-section shell" id="ruta">
        <div className="section-heading"><div><span className="eyebrow">TU PRIMERA RUTA</span><h2>De cero a tu primer PR.</h2></div><span className="progress-copy">0 de 3 completados</span></div>
        <div className="steps-list">
          {steps.map((step, index) => <article className={`step-card ${index === 0 ? 'step-active' : ''}`} key={step.number}>
            <span className="step-number">{step.number}</span><span className="step-icon"><Icon name={step.icon} size={19} /></span>
            <div className="step-content"><h3>{step.title}</h3><p>{step.detail}</p></div>
            <span className={`step-state ${index === 0 ? 'state-ready' : ''}`}>{index === 0 && <Icon name="check" size={14} />}{step.state}</span>
          </article>)}
        </div>
      </section>

      <footer className="footer shell"><a className="brand" href="#inicio"><span className="brand-mark"><span /><span /><span /></span><span>GitPath<span className="brand-dot">.</span></span></a><span>Aprende. Practica. Avanza.</span><span className="footer-status"><span className="status-dot" />Construyendo la primera ruta</span></footer>
    </main>
  )
}

export default App
