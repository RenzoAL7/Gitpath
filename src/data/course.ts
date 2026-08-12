export type VisualKind =
  | 'cover'
  | 'snapshot'
  | 'graph'
  | 'branch'
  | 'head'
  | 'staging'
  | 'undo'
  | 'rebase'
  | 'reflog'

export interface CourseSlide {
  id: string
  chapter: string
  chapterNumber: string
  eyebrow: string
  title: string
  accent: string
  summary: string
  takeaway: string
  bullets: string[]
  command?: string
  visual: VisualKind
}

export const courseSlides: CourseSlide[] = [
  {
    id: 'modelo-mental',
    chapter: 'Abrir la caja negra',
    chapterNumber: '01',
    eyebrow: 'ANTES DE LOS COMANDOS',
    title: 'Git no es magia negra.',
    accent: 'Es un mapa.',
    summary:
      'La confusión aparece cuando memorizas órdenes sin ver qué objeto o puntero está cambiando. Primero construimos el mapa; después usamos los comandos.',
    takeaway: 'Si puedes dibujar el estado, puedes decidir el siguiente paso.',
    bullets: ['Objetos que no cambian', 'Punteros que sí se mueven', 'Una historia que siempre deja pistas'],
    visual: 'cover',
  },
  {
    id: 'commit',
    chapter: 'Abrir la caja negra',
    chapterNumber: '01',
    eyebrow: 'EL OBJETO PRINCIPAL',
    title: 'Un commit es una foto.',
    accent: 'No una bolsa de cambios.',
    summary:
      'Cada commit conserva una instantánea del proyecto, un mensaje, su autor y la dirección de su commit padre. El hash identifica exactamente esa fotografía.',
    takeaway: 'El commit guarda un estado y señala hacia su pasado.',
    bullets: ['Snapshot del proyecto', 'Metadatos y mensaje', 'Referencia al padre'],
    command: 'git commit -m "feat: agrega búsqueda"',
    visual: 'snapshot',
  },
  {
    id: 'grafo',
    chapter: 'Abrir la caja negra',
    chapterNumber: '01',
    eyebrow: 'LA HISTORIA',
    title: 'La historia mira hacia atrás.',
    accent: 'Commit por commit.',
    summary:
      'Los commits forman un grafo dirigido: cada nuevo punto conoce a su padre. Por eso Git puede reconstruir el camino completo sin guardar una lista central de pasos.',
    takeaway: 'Git no ve una línea de tiempo: ve relaciones entre commits.',
    bullets: ['Cada flecha apunta al padre', 'Un merge puede tener dos padres', 'Los commits son inmutables'],
    command: 'git log --oneline --graph',
    visual: 'graph',
  },
  {
    id: 'ramas',
    chapter: 'Punteros, no carpetas',
    chapterNumber: '02',
    eyebrow: 'BRANCHES',
    title: 'Una rama es una etiqueta.',
    accent: 'Y pesa casi nada.',
    summary:
      'Crear una rama no duplica el proyecto. Git crea un nombre que apunta a un commit; cuando guardas otro commit en esa rama, la etiqueta avanza contigo.',
    takeaway: 'La rama no contiene commits: apunta al último de su camino.',
    bullets: ['Crear es instantáneo', 'Avanza al hacer commit', 'Dos ramas pueden señalar el mismo punto'],
    command: 'git switch -c feat/perfil',
    visual: 'branch',
  },
  {
    id: 'head',
    chapter: 'Punteros, no carpetas',
    chapterNumber: '02',
    eyebrow: 'TU POSICIÓN ACTUAL',
    title: 'HEAD responde:',
    accent: '“¿dónde estoy?”',
    summary:
      'Normalmente HEAD apunta a una rama, y esa rama apunta a un commit. Si HEAD apunta directo a un commit, estás en “detached HEAD”: puedes explorar, pero aún no tienes una rama que avance contigo.',
    takeaway: 'Antes de cambiar historia, confirma siempre dónde está HEAD.',
    bullets: ['HEAD → rama → commit', 'Cambiar de rama mueve HEAD', 'Detached HEAD no es una tragedia'],
    command: 'git status',
    visual: 'head',
  },
  {
    id: 'staging',
    chapter: 'Preparar el cambio',
    chapterNumber: '03',
    eyebrow: 'LA SALA DE ESPERA',
    title: 'Staging es una selección.',
    accent: 'No un trámite.',
    summary:
      'Tu working tree puede tener varios cambios, pero staging te deja decidir cuáles formarán la siguiente foto. Así un commit expresa una sola intención y es fácil de revisar.',
    takeaway: '“add” significa seleccionar para la próxima foto, no subir a GitHub.',
    bullets: ['Working tree: lo que editas', 'Staging: lo que eliges', 'Commit: lo que queda registrado'],
    command: 'git add src/perfil.ts',
    visual: 'staging',
  },
  {
    id: 'deshacer',
    chapter: 'Volver sin pánico',
    chapterNumber: '04',
    eyebrow: 'NO HAY UN SOLO “UNDO”',
    title: 'Deshacer es una decisión.',
    accent: 'Elige qué quieres conservar.',
    summary:
      'Restore toca archivos, reset mueve punteros y revert crea un commit nuevo. Se parecen desde fuera, pero afectan lugares distintos; por eso copiar un comando al azar puede salir caro.',
    takeaway: 'Pregunta primero: ¿archivo, puntero o historia compartida?',
    bullets: ['restore: recupera archivos', 'reset: mueve una referencia', 'revert: compensa sin borrar'],
    command: 'git revert HEAD',
    visual: 'undo',
  },
  {
    id: 'rebase',
    chapter: 'Volver sin pánico',
    chapterNumber: '04',
    eyebrow: 'REESCRIBIR HISTORIA',
    title: 'Rebase crea commits nuevos.',
    accent: 'No arrastra los anteriores.',
    summary:
      'Al cambiar el padre de un commit cambia también su identidad. Rebase reproduce tu trabajo sobre otra base y genera hashes nuevos: perfecto para ordenar trabajo local, peligroso si otros ya usan esa historia.',
    takeaway: 'Rebase una historia privada; coordina antes de reescribir una compartida.',
    bullets: ['Mismo cambio, nueva identidad', 'Historia lineal y limpia', 'Evítalo en ramas públicas sin acuerdo'],
    command: 'git rebase main',
    visual: 'rebase',
  },
  {
    id: 'reflog',
    chapter: 'Volver sin pánico',
    chapterNumber: '04',
    eyebrow: 'TU RED DE SEGURIDAD LOCAL',
    title: 'Reflog recuerda los movimientos.',
    accent: 'Incluso cuando tú no.',
    summary:
      'Ramas y HEAD pueden moverse, pero reflog conserva un registro local de esos saltos. Si un commit “desaparece”, primero busca su hash aquí y decide con calma cómo recuperarlo.',
    takeaway: 'Cuando algo parece perdido: pausa, mira reflog y verifica antes de resetear.',
    bullets: ['Registra movimientos de HEAD', 'Permite encontrar commits huérfanos', 'Es local y temporal, no un backup'],
    command: 'git reflog',
    visual: 'reflog',
  },
]

export const courseChapters = [
  { number: '01', title: 'Abrir la caja negra', slideId: 'modelo-mental' },
  { number: '02', title: 'Punteros, no carpetas', slideId: 'ramas' },
  { number: '03', title: 'Preparar el cambio', slideId: 'staging' },
  { number: '04', title: 'Volver sin pánico', slideId: 'deshacer' },
]
