import type { Challenge, ChallengeMatcher } from '../data/challenges'

export interface GraphCommit {
  id: string
  parents: string[]
  message: string
  lane: string
  rewritten?: boolean
}

export interface ChallengeTranscriptLine {
  type: 'command' | 'output' | 'error' | 'hint'
  text: string
}

export interface ChallengeState {
  commits: GraphCommit[]
  branches: Record<string, string>
  head: { mode: 'branch' | 'detached'; ref: string }
  nextCommit: number
  currentStep: number
  attempts: number
  completed: boolean
  transcript: ChallengeTranscriptLine[]
  feedback: { tone: 'neutral' | 'error' | 'success'; text: string }
}

interface ParsedCommand {
  matcher: ChallengeMatcher
  target?: string
  message?: string
}

export function normalizeChallengeCommand(command: string) {
  return command.trim().replace(/\s+/g, ' ')
}

function parseCommand(rawCommand: string): ParsedCommand | undefined {
  const command = normalizeChallengeCommand(rawCommand)
  const commit = command.match(/^git commit(?: -m (?:"([^"]+)"|'([^']+)'|(.+)))?$/)
  if (commit) return { matcher: 'commit', message: commit[1] ?? commit[2] ?? commit[3] ?? 'nuevo cambio' }

  const branch = command.match(/^git branch ([\w./-]+)$/)
  if (branch) return { matcher: 'branch', target: branch[1] }

  const switchBranch = command.match(/^git (?:switch|checkout) ([\w./-]+)$/)
  if (switchBranch) return { matcher: 'switch', target: switchBranch[1] }

  const merge = command.match(/^git merge ([\w./-]+)$/)
  if (merge) return { matcher: 'merge', target: merge[1] }

  const detach = command.match(/^git (?:switch --detach|checkout) ([\w.'-]+)$/)
  if (detach) return { matcher: 'detach', target: detach[1] }

  const rebase = command.match(/^git rebase ([\w./-]+)$/)
  if (rebase) return { matcher: 'rebase', target: rebase[1] }

  return undefined
}

function headCommit(state: ChallengeState) {
  return state.head.mode === 'branch' ? state.branches[state.head.ref] : state.head.ref
}

function ancestors(state: ChallengeState, start: string) {
  const found = new Set<string>()
  const queue = [start]
  while (queue.length) {
    const id = queue.shift()!
    if (found.has(id)) continue
    found.add(id)
    const commit = state.commits.find((item) => item.id === id)
    if (commit) queue.push(...commit.parents)
  }
  return found
}

function isAncestor(state: ChallengeState, candidate: string, start: string) {
  return ancestors(state, start).has(candidate)
}

function applyCommand(state: ChallengeState, command: ParsedCommand): { state: ChallengeState; output: string } {
  const next: ChallengeState = {
    ...state,
    commits: state.commits.map((commit) => ({ ...commit, parents: [...commit.parents] })),
    branches: { ...state.branches },
    head: { ...state.head },
    transcript: [...state.transcript],
  }

  if (command.matcher === 'commit') {
    const id = `c${next.nextCommit}`
    const lane = next.head.mode === 'branch' ? next.head.ref : 'detached'
    next.commits.push({ id, parents: [headCommit(next)], message: command.message ?? 'nuevo cambio', lane })
    if (next.head.mode === 'branch') next.branches[next.head.ref] = id
    else next.head.ref = id
    next.nextCommit += 1
    return { state: next, output: `[${lane} ${id}] ${command.message ?? 'nuevo cambio'}` }
  }

  if (command.matcher === 'branch') {
    next.branches[command.target!] = headCommit(next)
    return { state: next, output: `Rama ${command.target} creada en ${headCommit(next)}.` }
  }

  if (command.matcher === 'switch') {
    next.head = { mode: 'branch', ref: command.target! }
    return { state: next, output: `Cambiado a la rama «${command.target}».` }
  }

  if (command.matcher === 'detach') {
    next.head = { mode: 'detached', ref: command.target! }
    return { state: next, output: `HEAD ahora apunta directamente a ${command.target}. main no se movió.` }
  }

  if (command.matcher === 'merge') {
    const source = next.branches[command.target!]
    const current = headCommit(next)
    if (isAncestor(next, current, source)) {
      next.branches[next.head.ref] = source
      return { state: next, output: `Fast-forward: ${next.head.ref} avanzó hasta ${source}.` }
    }

    const id = `m${next.nextCommit}`
    next.commits.push({ id, parents: [current, source], message: `merge ${command.target}`, lane: next.head.ref })
    next.branches[next.head.ref] = id
    next.nextCommit += 1
    return { state: next, output: `Merge completado en ${id}. Este commit tiene dos padres.` }
  }

  const target = next.branches[command.target!]
  const currentTip = headCommit(next)
  const targetAncestors = ancestors(next, target)
  const unique: GraphCommit[] = []
  let cursor: string | undefined = currentTip
  while (cursor && !targetAncestors.has(cursor)) {
    const commit = next.commits.find((item) => item.id === cursor)
    if (!commit) break
    unique.push(commit)
    cursor = commit.parents[0]
  }

  unique.forEach((commit) => {
    const original = next.commits.find((item) => item.id === commit.id)
    if (original) original.lane = `${next.head.ref} · antes`
  })

  let parent = target
  unique.reverse().forEach((commit, index) => {
    const id = `${commit.id}′`
    next.commits.push({ id, parents: [parent], message: commit.message, lane: next.head.ref, rewritten: true })
    parent = id
    if (index === unique.length - 1) next.branches[next.head.ref] = id
  })
  return { state: next, output: `${unique.length} commits reproducidos sobre ${command.target}. Los hashes cambiaron.` }
}

function commandMatches(command: ParsedCommand, matcher: ChallengeMatcher, target?: string) {
  if (command.matcher !== matcher) return false
  return !target || command.target?.toLowerCase() === target.toLowerCase()
}

export function createChallengeSession(challenge: Challenge): ChallengeState {
  return {
    commits: challenge.seed.commits.map((commit) => ({ ...commit, parents: [...commit.parents] })),
    branches: { ...challenge.seed.branches },
    head: { ...challenge.seed.head },
    nextCommit: challenge.seed.nextCommit,
    currentStep: 0,
    attempts: 0,
    completed: false,
    transcript: [
      { type: 'output', text: `Nivel ${challenge.number} cargado. HEAD → ${challenge.seed.head.ref}` },
      { type: 'hint', text: challenge.steps[0].instruction },
    ],
    feedback: { tone: 'neutral', text: challenge.steps[0].explanation },
  }
}

export function runChallengeCommand(state: ChallengeState, challenge: Challenge, rawCommand: string): { accepted: boolean; state: ChallengeState } {
  const normalized = normalizeChallengeCommand(rawCommand)
  const parsed = parseCommand(normalized)
  const step = challenge.steps[state.currentStep]

  if (!normalized || !parsed || !commandMatches(parsed, step.matcher, step.target)) {
    return {
      accepted: false,
      state: {
        ...state,
        attempts: state.attempts + 1,
        transcript: [
          ...state.transcript,
          ...(normalized ? [{ type: 'command' as const, text: normalized }] : []),
          { type: 'error' as const, text: `Ese movimiento no cumple el objetivo actual. Prueba: ${step.example}` },
        ],
        feedback: { tone: 'error' as const, text: step.explanation },
      },
    }
  }

  if (parsed.matcher === 'switch' && !state.branches[parsed.target!]) {
    return {
      accepted: false,
      state: {
        ...state,
        attempts: state.attempts + 1,
        transcript: [...state.transcript, { type: 'command' as const, text: normalized }, { type: 'error' as const, text: `La rama ${parsed.target} todavía no existe.` }],
        feedback: { tone: 'error' as const, text: 'Primero crea la rama y luego cambia HEAD.' },
      },
    }
  }

  const applied = applyCommand({ ...state, transcript: [...state.transcript, { type: 'command', text: normalized }] }, parsed)
  const nextStep = state.currentStep + 1
  const completed = nextStep >= challenge.steps.length
  const next = challenge.steps[nextStep]
  return {
    accepted: true,
    state: {
      ...applied.state,
      currentStep: nextStep,
      attempts: state.attempts + 1,
      completed,
      transcript: [
        ...applied.state.transcript,
        { type: 'output', text: applied.output },
        ...(next ? [{ type: 'hint' as const, text: next.instruction }] : []),
      ],
      feedback: {
        tone: completed ? 'success' : 'neutral',
        text: completed ? challenge.success : next.explanation,
      },
    },
  }
}
