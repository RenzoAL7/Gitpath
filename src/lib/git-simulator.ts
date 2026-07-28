import type { Lesson, LessonStep, StepMatcher } from '../data/lessons'

export type FeedbackTone = 'neutral' | 'success' | 'error'

export interface TranscriptLine {
  type: 'command' | 'output' | 'error' | 'hint'
  text: string
}

export interface SimulatorState {
  currentBranch: string
  branches: string[]
  head: string
  commits: string[]
  workingTree: 'clean' | 'modified' | 'conflict'
  staged: boolean
  currentStep: number
  commandCount: number
  transcript: TranscriptLine[]
  feedback: { tone: FeedbackTone; text: string }
  completed: boolean
}

export interface CommandResult {
  state: SimulatorState
  accepted: boolean
}

function printable(text: string) {
  return text.replace(/\\n/g, '\n')
}

function nextCommitId(commandCount: number) {
  return `c${String(commandCount + 1).padStart(2, '0')}e`
}

function applyStep(state: SimulatorState, step: LessonStep, command: string): SimulatorState {
  const next = {
    ...state,
    branches: [...state.branches],
    commits: [...state.commits],
    transcript: [...state.transcript],
  }

  switch (step.matcher) {
    case 'switch-branch': {
      const match = command.match(/^git (?:switch(?: -c)?|checkout(?: -b)?) ([\w./-]+)$/)
      const branch = match?.[1] ?? next.currentBranch
      if (!next.branches.includes(branch)) next.branches.push(branch)
      next.currentBranch = branch
      break
    }
    case 'add':
      next.staged = true
      if (next.workingTree === 'conflict') next.workingTree = 'clean'
      break
    case 'commit': {
      const commit = nextCommitId(next.commandCount)
      next.head = commit
      next.commits.push(commit)
      next.staged = false
      next.workingTree = 'clean'
      break
    }
    case 'merge':
      next.workingTree = 'conflict'
      next.staged = false
      break
    case 'revert': {
      const commit = nextCommitId(next.commandCount)
      next.head = commit
      next.commits.push(commit)
      next.workingTree = 'clean'
      break
    }
    case 'reset':
      next.head = '3a8ce1'
      next.workingTree = 'clean'
      next.staged = false
      break
    case 'status':
    case 'reflog':
    case 'log':
      break
  }

  return next
}

export function normalizeCommand(command: string) {
  return command.trim().replace(/\s+/g, ' ')
}

export function matchesStep(command: string, matcher: StepMatcher) {
  switch (matcher) {
    case 'status':
      return /^git status(?: --short)?$/.test(command)
    case 'add':
      return /^git add (?:\.|[^ ]+)$/.test(command)
    case 'commit':
      return /^git commit -m (?:".+"|'.+'|.+)$/.test(command)
    case 'switch-branch':
      return /^git (?:switch(?: -c)?|checkout(?: -b)?) [\w./-]+$/.test(command)
    case 'merge':
      return /^git merge [\w./-]+$/.test(command)
    case 'revert':
      return /^git revert (?:HEAD|[a-f0-9]+)$/i.test(command)
    case 'reflog':
      return /^git reflog(?: --all)?$/.test(command)
    case 'reset':
      return /^git reset --hard (?:HEAD@\{\d+\}|[a-f0-9]+)$/i.test(command)
    case 'log':
      return /^git log(?: --oneline)?$/.test(command)
  }
}

export function createSession(lesson: Lesson): SimulatorState {
  const opening = lesson.start.workingTree === 'modified'
    ? 'Hay cambios locales sin guardar.'
    : lesson.start.workingTree === 'conflict'
      ? 'Hay un conflicto pendiente de resolver.'
      : 'working tree limpio.'

  return {
    currentBranch: lesson.start.branch,
    branches: [...lesson.start.branches],
    head: lesson.start.head,
    commits: [lesson.start.head],
    workingTree: lesson.start.workingTree,
    staged: false,
    currentStep: 0,
    commandCount: 0,
    transcript: [
      { type: 'output', text: `Escenario cargado en ${lesson.start.branch}. ${opening}` },
      { type: 'hint', text: `Empieza con ${lesson.steps[0].command}` },
    ],
    feedback: { tone: 'neutral', text: lesson.steps[0].hint },
    completed: false,
  }
}

export function runCommand(session: SimulatorState, lesson: Lesson, rawCommand: string): CommandResult {
  const command = normalizeCommand(rawCommand)
  if (!command) {
    return {
      accepted: false,
      state: {
        ...session,
        feedback: { tone: 'error', text: 'Escribe un comando para continuar.' },
      },
    }
  }

  if (session.completed) {
    return {
      accepted: false,
      state: {
        ...session,
        transcript: [...session.transcript, { type: 'command', text: command }],
        feedback: { tone: 'neutral', text: 'Misión completada. Puedes reiniciarla para practicar otra vez.' },
      },
    }
  }

  const step = lesson.steps[session.currentStep]
  const transcript = [...session.transcript, { type: 'command' as const, text: command }]

  if (!matchesStep(command, step.matcher)) {
    const state: SimulatorState = {
      ...session,
      commandCount: session.commandCount + 1,
      transcript: [
        ...transcript,
        { type: 'error', text: `Ese comando no resuelve el paso actual. Prueba con ${step.command}.` },
        { type: 'hint', text: step.hint },
      ],
      feedback: { tone: 'error', text: step.hint },
    }
    return { accepted: false, state }
  }

  const progressed = applyStep(
    { ...session, transcript, commandCount: session.commandCount + 1 },
    step,
    command,
  )
  const nextStep = session.currentStep + 1
  const completed = nextStep >= lesson.steps.length

  const state: SimulatorState = {
    ...progressed,
    currentStep: nextStep,
    completed,
    transcript: [
      ...progressed.transcript,
      { type: 'output', text: printable(step.output) },
      ...(completed ? [] : [{ type: 'hint' as const, text: `Siguiente: ${lesson.steps[nextStep].command}` }]),
    ],
    feedback: {
      tone: completed ? 'success' : 'neutral',
      text: completed ? lesson.success : step.hint,
    },
  }

  return { accepted: true, state }
}
