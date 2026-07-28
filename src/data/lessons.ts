export type LessonLevel = 'Inicial' | 'Intermedio' | 'Rescate'

export type StepMatcher =
  | 'status'
  | 'add'
  | 'commit'
  | 'switch-branch'
  | 'merge'
  | 'revert'
  | 'reflog'
  | 'reset'
  | 'log'

export interface LessonStep {
  command: string
  matcher: StepMatcher
  output: string
  hint: string
}

export interface LessonStart {
  branch: string
  branches: string[]
  head: string
  workingTree: 'clean' | 'modified' | 'conflict'
}

export interface Lesson {
  id: string
  number: string
  title: string
  shortTitle: string
  level: LessonLevel
  duration: string
  category: string
  scenario: string
  objective: string
  detail: string
  concepts: string[]
  start: LessonStart
  steps: LessonStep[]
  success: string
}

export const lessons: Lesson[] = [
  {
    id: 'first-commit',
    number: '01',
    title: 'Tu primer commit',
    shortTitle: 'Primer commit',
    level: 'Inicial',
    duration: '5 min',
    category: 'Fundamentos',
    scenario: 'Un compañero dejó una mejora en README.md sin registrar y te pidió prepararla para compartir.',
    objective: 'Inspeccionar, preparar y registrar un cambio pequeño con intención.',
    detail: 'Entiende el recorrido working tree → staging → commit antes de trabajar con equipos.',
    concepts: ['working tree', 'staging area', 'commit'],
    start: { branch: 'main', branches: ['main'], head: 'a1f3c2', workingTree: 'modified' },
    steps: [
      {
        command: 'git status',
        matcher: 'status',
        output: 'En la rama main\\nCambios no preparados: README.md',
        hint: 'Primero observa el estado. Git te dice qué está a salvo y qué todavía no.',
      },
      {
        command: 'git add .',
        matcher: 'add',
        output: 'README.md ahora está en staging.\\nListo para formar parte del próximo commit.',
        hint: 'Staging es una selección explícita: decide qué cambio quieres guardar.',
      },
      {
        command: 'git commit -m "docs: actualiza la guía"',
        matcher: 'commit',
        output: '[main b7c91d] docs: actualiza la guía\\n1 file changed, 8 insertions(+)',
        hint: 'Un buen mensaje explica la intención del cambio, no solo que “se cambió algo”.',
      },
    ],
    success: 'Cambio guardado. Ya puedes explicar qué entra en un commit y por qué.',
  },
  {
    id: 'safe-branch',
    number: '02',
    title: 'No rompas main',
    shortTitle: 'Crea tu rama',
    level: 'Inicial',
    duration: '7 min',
    category: 'Trabajo en equipo',
    scenario: 'Producción está estable, pero necesitas desarrollar una nueva pantalla sin tocar main.',
    objective: 'Crear una rama de trabajo y dejar un cambio aislado.',
    detail: 'La rama no es una copia misteriosa: es un nombre que apunta a una línea de commits.',
    concepts: ['branch', 'HEAD', 'aislamiento'],
    start: { branch: 'main', branches: ['main'], head: 'b7c91d', workingTree: 'modified' },
    steps: [
      {
        command: 'git switch -c feat/dashboard',
        matcher: 'switch-branch',
        output: 'Cambiado a una nueva rama «feat/dashboard».\\nTu trabajo ya no toca main.',
        hint: 'Nombra la rama por el trabajo que contiene. El nombre también comunica contexto.',
      },
      {
        command: 'git add .',
        matcher: 'add',
        output: 'Cambios de la pantalla preparados en staging.',
        hint: 'Prepara solo lo que pertenece a esta tarea.',
      },
      {
        command: 'git commit -m "feat: agrega dashboard"',
        matcher: 'commit',
        output: '[feat/dashboard c4e202] feat: agrega dashboard\\n2 files changed, 34 insertions(+)',
        hint: 'El commit es el punto seguro desde el que puedes abrir una PR o volver atrás.',
      },
    ],
    success: 'Cambio aislado. El equipo puede revisar tu trabajo sin arriesgar main.',
  },
  {
    id: 'revert-release',
    number: '03',
    title: 'Deshaz sin borrar historia',
    shortTitle: 'Revierte un error',
    level: 'Intermedio',
    duration: '8 min',
    category: 'Incidentes',
    scenario: 'Un commit que llegó a producción introdujo un bug. Necesitas neutralizarlo sin reescribir la historia compartida.',
    objective: 'Usar revert para crear una corrección auditable.',
    detail: 'Aprende por qué “deshacer” en una rama pública no significa borrar commits.',
    concepts: ['revert', 'historia pública', 'rollback'],
    start: { branch: 'main', branches: ['main'], head: 'bad88e', workingTree: 'clean' },
    steps: [
      {
        command: 'git status',
        matcher: 'status',
        output: 'En la rama main\\nTu rama está actualizada con origin/main.\\nworking tree limpio.',
        hint: 'Antes de tocar una rama compartida, confirma que no tienes trabajo local pendiente.',
      },
      {
        command: 'git revert HEAD',
        matcher: 'revert',
        output: '[main 6ad210] Revert "feat: activa checkout experimental"\\n1 file changed, 4 deletions(-)',
        hint: 'revert crea otro commit que compensa el anterior. La historia sigue siendo trazable.',
      },
      {
        command: 'git log --oneline',
        matcher: 'log',
        output: '6ad210 Revert "feat: activa checkout experimental"\\nbad88e feat: activa checkout experimental\\na1f3c2 base estable',
        hint: 'Comprueba el resultado: el commit problemático sigue visible y el remedio también.',
      },
    ],
    success: 'Incidente contenido. Puedes explicar rollback, trazabilidad y seguridad en una entrevista.',
  },
  {
    id: 'resolve-conflict',
    number: '04',
    title: 'Resuelve un conflicto',
    shortTitle: 'Conflicto de merge',
    level: 'Intermedio',
    duration: '10 min',
    category: 'Colaboración',
    scenario: 'Tu rama y main editaron la misma sección. El merge se detuvo y ahora debes recuperar el control.',
    objective: 'Leer un conflicto, marcar su resolución y cerrar el merge.',
    detail: 'Los conflictos no son errores de Git: son decisiones que el equipo debe tomar con contexto.',
    concepts: ['merge', 'conflict markers', 'resolución'],
    start: { branch: 'feat/checkout', branches: ['main', 'feat/checkout'], head: 'c4e202', workingTree: 'clean' },
    steps: [
      {
        command: 'git switch feat/checkout',
        matcher: 'switch-branch',
        output: 'Cambiado a la rama «feat/checkout».',
        hint: 'Ponte en la rama que recibirá los cambios antes de mezclar.',
      },
      {
        command: 'git merge main',
        matcher: 'merge',
        output: 'CONFLICT (content): Merge conflict en src/checkout.ts\\nAutomatic merge failed; fix conflicts and then commit the result.',
        hint: 'Git pausó el merge para que decidas qué versión conserva el comportamiento correcto.',
      },
      {
        command: 'git add src/checkout.ts',
        matcher: 'add',
        output: 'Conflicto marcado como resuelto en src/checkout.ts.',
        hint: 'Después de editar y eliminar los marcadores, add comunica que revisaste el archivo.',
      },
      {
        command: 'git commit -m "merge: resuelve checkout"',
        matcher: 'commit',
        output: '[feat/checkout 7fe103] merge: resuelve checkout\\nMerge made by the ort strategy.',
        hint: 'El commit final cierra el merge y deja una explicación para el siguiente integrante.',
      },
    ],
    success: 'Conflicto resuelto. Ya sabes distinguir un problema de contenido de un problema de comandos.',
  },
  {
    id: 'recover-reflog',
    number: '05',
    title: 'Recupera un commit perdido',
    shortTitle: 'Rescate con reflog',
    level: 'Rescate',
    duration: '9 min',
    category: 'Rescate',
    scenario: 'Un reset movió HEAD y parece que desapareció tu trabajo. Antes de entrar en pánico, busca el rastro local.',
    objective: 'Encontrar una referencia anterior y recuperar el estado correcto.',
    detail: 'reflog es una red de seguridad local: no reemplaza los backups, pero convierte un susto en diagnóstico.',
    concepts: ['reflog', 'HEAD', 'reset --hard'],
    start: { branch: 'feat/search', branches: ['main', 'feat/search'], head: '91bd77', workingTree: 'clean' },
    steps: [
      {
        command: 'git reflog',
        matcher: 'reflog',
        output: '91bd77 HEAD@{0}: reset: moving to HEAD~1\\n3a8ce1 HEAD@{1}: commit: feat: agrega búsqueda\\n...',
        hint: 'El reflog registra movimientos locales de HEAD aunque ya no aparezcan en una rama.',
      },
      {
        command: 'git reset --hard HEAD@{1}',
        matcher: 'reset',
        output: 'HEAD is now at 3a8ce1 feat: agrega búsqueda\\nEstado recuperado.',
        hint: 'Este comando es potente y destructivo para cambios no guardados. Úsalo con una referencia comprobada.',
      },
      {
        command: 'git log --oneline',
        matcher: 'log',
        output: '3a8ce1 feat: agrega búsqueda\\n91bd77 chore: prepara filtros\\na1f3c2 base estable',
        hint: 'Siempre verifica el estado final después de una operación de rescate.',
      },
    ],
    success: 'Trabajo recuperado. La lección importante: diagnostica antes de ejecutar un comando destructivo.',
  },
]

export interface FailureCase {
  title: string
  symptom: string
  risk: string
  rescue: string
  tone: 'orange' | 'purple' | 'green'
}

export const failureCases: FailureCase[] = [
  {
    title: 'Commit directo a main',
    symptom: 'El cambio funciona en tu máquina, pero nadie lo revisó.',
    risk: 'Rompes la rama compartida y pierdes contexto de revisión.',
    rescue: 'git switch -c feat/nombre',
    tone: 'orange',
  },
  {
    title: 'Push rechazado',
    symptom: 'origin tiene commits que tu copia local todavía no conoce.',
    risk: 'Un force push puede borrar trabajo de otra persona.',
    rescue: 'git pull --rebase',
    tone: 'purple',
  },
  {
    title: 'Reset en el lugar equivocado',
    symptom: 'HEAD ya no apunta al commit que esperabas.',
    risk: 'Los cambios sin commit pueden desaparecer del working tree.',
    rescue: 'git reflog → git reset',
    tone: 'green',
  },
]
