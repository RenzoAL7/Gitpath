export type ChallengeMatcher = 'commit' | 'branch' | 'switch' | 'merge' | 'detach' | 'rebase'

export interface ChallengeCommitSeed {
  id: string
  parents: string[]
  message: string
  lane: string
}

export interface ChallengeSeed {
  commits: ChallengeCommitSeed[]
  branches: Record<string, string>
  head: { mode: 'branch' | 'detached'; ref: string }
  nextCommit: number
}

export interface ChallengeStep {
  matcher: ChallengeMatcher
  target?: string
  example: string
  instruction: string
  explanation: string
}

export interface Challenge {
  id: string
  number: string
  world: 'Primeros pasos' | 'Mover la historia'
  title: string
  shortTitle: string
  difficulty: 'Base' | 'Intermedio'
  duration: string
  story: string
  objective: string
  mentalModel: string
  seed: ChallengeSeed
  steps: ChallengeStep[]
  success: string
}

export const challenges: Challenge[] = [
  {
    id: 'commit-basics',
    number: '01',
    world: 'Primeros pasos',
    title: 'Construye una historia',
    shortTitle: 'Dos commits',
    difficulty: 'Base',
    duration: '3 min',
    story: 'El repositorio acaba de nacer. Ya hay cambios preparados y quieres guardar dos momentos del proyecto.',
    objective: 'Crear dos commits y observar cómo main avanza con cada fotografía.',
    mentalModel: 'Cada commit nuevo recuerda a su padre; la rama main solo apunta al más reciente.',
    seed: {
      commits: [{ id: 'c0', parents: [], message: 'inicio', lane: 'main' }],
      branches: { main: 'c0' },
      head: { mode: 'branch', ref: 'main' },
      nextCommit: 1,
    },
    steps: [
      {
        matcher: 'commit',
        example: 'git commit -m "crea README"',
        instruction: 'Guarda la primera fotografía.',
        explanation: 'El commit nace después de c0 y main se mueve hacia él.',
      },
      {
        matcher: 'commit',
        example: 'git commit -m "agrega perfil"',
        instruction: 'Guarda una segunda fotografía.',
        explanation: 'La historia ahora tiene tres estados conectados.',
      },
    ],
    success: 'Creaste una historia lineal. Los commits no se mueven; main sí.',
  },
  {
    id: 'branch-basics',
    number: '02',
    world: 'Primeros pasos',
    title: 'Abre un camino seguro',
    shortTitle: 'Crea una rama',
    difficulty: 'Base',
    duration: '4 min',
    story: 'main está estable y quieres experimentar con una pantalla de perfil sin mezclar todavía ese trabajo.',
    objective: 'Crear feature, cambiarte a ella y hacer un commit sin mover main.',
    mentalModel: 'Una rama es un nombre que apunta a un commit. HEAD indica qué nombre moverá el siguiente commit.',
    seed: {
      commits: [
        { id: 'c0', parents: [], message: 'inicio', lane: 'main' },
        { id: 'c1', parents: ['c0'], message: 'base estable', lane: 'main' },
      ],
      branches: { main: 'c1' },
      head: { mode: 'branch', ref: 'main' },
      nextCommit: 2,
    },
    steps: [
      {
        matcher: 'branch',
        target: 'feature',
        example: 'git branch feature',
        instruction: 'Crea la rama feature.',
        explanation: 'Al nacer, feature apunta al mismo commit que main.',
      },
      {
        matcher: 'switch',
        target: 'feature',
        example: 'git switch feature',
        instruction: 'Mueve HEAD a feature.',
        explanation: 'Ahora el siguiente commit hará avanzar feature, no main.',
      },
      {
        matcher: 'commit',
        example: 'git commit -m "crea perfil"',
        instruction: 'Guarda el trabajo en la nueva rama.',
        explanation: 'feature avanza y main permanece en la base estable.',
      },
    ],
    success: 'Aislaste el cambio correctamente: dos ramas, dos punteros, una base común.',
  },
  {
    id: 'merge-basics',
    number: '03',
    world: 'Primeros pasos',
    title: 'Une dos caminos',
    shortTitle: 'Merge visual',
    difficulty: 'Base',
    duration: '4 min',
    story: 'main y feature avanzaron por separado. El trabajo de feature ya fue revisado y toca integrarlo.',
    objective: 'Fusionar feature dentro de main y reconocer un commit con dos padres.',
    mentalModel: 'Un merge conserva ambos recorridos y crea un punto que recuerda de dónde vino cada uno.',
    seed: {
      commits: [
        { id: 'c0', parents: [], message: 'inicio', lane: 'main' },
        { id: 'm1', parents: ['c0'], message: 'ajusta navegación', lane: 'main' },
        { id: 'f1', parents: ['c0'], message: 'crea perfil', lane: 'feature' },
      ],
      branches: { main: 'm1', feature: 'f1' },
      head: { mode: 'branch', ref: 'main' },
      nextCommit: 2,
    },
    steps: [
      {
        matcher: 'merge',
        target: 'feature',
        example: 'git merge feature',
        instruction: 'Fusiona feature en la rama actual.',
        explanation: 'Git crea un commit de merge con main y feature como padres.',
      },
    ],
    success: 'La historia se unió sin borrar ninguno de los dos recorridos.',
  },
  {
    id: 'detached-head',
    number: '04',
    world: 'Mover la historia',
    title: 'Separa HEAD con intención',
    shortTitle: 'HEAD separado',
    difficulty: 'Intermedio',
    duration: '4 min',
    story: 'Necesitas inspeccionar el proyecto exactamente como estaba en c1, sin mover la rama main.',
    objective: 'Apuntar HEAD directamente a c1 y distinguir commit de rama.',
    mentalModel: 'Normalmente HEAD apunta a una rama. En modo separado apunta directamente a un commit.',
    seed: {
      commits: [
        { id: 'c0', parents: [], message: 'inicio', lane: 'main' },
        { id: 'c1', parents: ['c0'], message: 'versión uno', lane: 'main' },
        { id: 'c2', parents: ['c1'], message: 'versión dos', lane: 'main' },
      ],
      branches: { main: 'c2' },
      head: { mode: 'branch', ref: 'main' },
      nextCommit: 3,
    },
    steps: [
      {
        matcher: 'detach',
        target: 'c1',
        example: 'git switch --detach c1',
        instruction: 'Viaja a c1 sin mover main.',
        explanation: 'HEAD queda en c1; main sigue apuntando a c2.',
      },
    ],
    success: 'Inspeccionaste el pasado sin reescribir ni mover la rama principal.',
  },
  {
    id: 'rebase-basics',
    number: '05',
    world: 'Mover la historia',
    title: 'Cambia la base',
    shortTitle: 'Rebase visual',
    difficulty: 'Intermedio',
    duration: '6 min',
    story: 'feature nació antes del último cambio de main. Quieres colocar tus commits sobre la base actual.',
    objective: 'Reproducir feature encima de main y observar que aparecen commits nuevos.',
    mentalModel: 'Rebase copia el trabajo sobre otra base. El contenido puede ser equivalente, pero los hashes cambian.',
    seed: {
      commits: [
        { id: 'c0', parents: [], message: 'inicio', lane: 'main' },
        { id: 'm1', parents: ['c0'], message: 'actualiza base', lane: 'main' },
        { id: 'f1', parents: ['c0'], message: 'inicia perfil', lane: 'feature' },
        { id: 'f2', parents: ['f1'], message: 'termina perfil', lane: 'feature' },
      ],
      branches: { main: 'm1', feature: 'f2' },
      head: { mode: 'branch', ref: 'feature' },
      nextCommit: 3,
    },
    steps: [
      {
        matcher: 'rebase',
        target: 'main',
        example: 'git rebase main',
        instruction: 'Reproduce feature sobre main.',
        explanation: 'Los commits de feature se copian sobre m1 y reciben nuevos identificadores.',
      },
    ],
    success: 'feature ahora parte de la base actual y mantiene una historia lineal.',
  },
]

export const challengeWorlds = ['Primeros pasos', 'Mover la historia'] as const
