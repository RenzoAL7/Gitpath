import type { CSSProperties } from 'react'
import type { ChallengeState } from '../lib/challenge-simulator'

function reachableCommits(state: ChallengeState) {
  const reachable = new Set<string>()
  const queue = [...Object.values(state.branches), ...(state.head.mode === 'detached' ? [state.head.ref] : [])]
  while (queue.length) {
    const id = queue.shift()!
    if (reachable.has(id)) continue
    reachable.add(id)
    const commit = state.commits.find((item) => item.id === id)
    if (commit) queue.push(...commit.parents)
  }
  return reachable
}

function commitDepths(state: ChallengeState) {
  const depths = new Map<string, number>()
  const calculate = (id: string, trail = new Set<string>()): number => {
    if (depths.has(id)) return depths.get(id)!
    if (trail.has(id)) return 0
    const commit = state.commits.find((item) => item.id === id)
    if (!commit || !commit.parents.length) {
      depths.set(id, 0)
      return 0
    }
    const nextTrail = new Set(trail).add(id)
    const depth = Math.max(...commit.parents.map((parent) => calculate(parent, nextTrail))) + 1
    depths.set(id, depth)
    return depth
  }
  state.commits.forEach((commit) => calculate(commit.id))
  return depths
}

export function GraphBoard({ state, compact = false }: { state: ChallengeState; compact?: boolean }) {
  const depths = commitDepths(state)
  const reachable = reachableCommits(state)
  const lanes = [...new Set(['main', ...state.commits.map((commit) => commit.lane), ...Object.keys(state.branches)])]
    .filter((lane) => lane !== 'detached' || state.commits.some((commit) => commit.lane === 'detached'))
  const maxDepth = Math.max(0, ...depths.values())
  const originX = compact ? 78 : 110
  const xGap = compact ? 88 : 118
  const originY = compact ? 48 : 66
  const yGap = compact ? 70 : 94
  const nodeSize = compact ? 27 : 34
  const boardWidth = originX + (maxDepth + 1) * xGap + (compact ? 100 : 180)
  const boardHeight = originY + lanes.length * yGap + (compact ? 25 : 45)
  const positions = new Map(state.commits.map((commit) => [
    commit.id,
    {
      x: originX + (depths.get(commit.id) ?? 0) * xGap,
      y: originY + Math.max(0, lanes.indexOf(commit.lane)) * yGap,
    },
  ]))
  const current = state.head.mode === 'branch' ? state.branches[state.head.ref] : state.head.ref
  const pointers = Object.entries(state.branches)

  return (
    <div className={`graph-board${compact ? ' graph-board-compact' : ''}`} role="img" aria-label="Grafo de commits y ramas del ejercicio">
      <div className="graph-board-inner" style={{ width: boardWidth, height: boardHeight }}>
        {lanes.map((lane, index) => <span className="graph-lane-name" key={lane} style={{ top: originY + index * yGap + nodeSize / 2 }}>{lane}</span>)}
        {state.commits.flatMap((commit) => commit.parents.map((parent) => {
          const from = positions.get(parent)
          const to = positions.get(commit.id)
          if (!from || !to) return null
          const x1 = from.x + nodeSize / 2
          const y1 = from.y + nodeSize / 2
          const x2 = to.x + nodeSize / 2
          const y2 = to.y + nodeSize / 2
          const length = Math.hypot(x2 - x1, y2 - y1)
          const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI)
          return <i className={`graph-edge${reachable.has(commit.id) ? '' : ' orphan'}`} key={`${commit.id}-${parent}`} style={{ left: x1, top: y1, width: length, transform: `rotate(${angle}deg)` }} />
        }))}
        {state.commits.map((commit) => {
          const position = positions.get(commit.id)!
          const active = commit.id === current
          const orphan = !reachable.has(commit.id)
          return (
            <div className={`graph-commit${active ? ' current' : ''}${commit.rewritten ? ' rewritten' : ''}${orphan ? ' orphan' : ''}`} key={commit.id} style={{ left: position.x, top: position.y, width: nodeSize, height: nodeSize }}>
              <strong>{commit.id}</strong>
              {!compact && <small>{commit.message}</small>}
            </div>
          )
        })}
        {pointers.map(([branch, commitId], index) => {
          const position = positions.get(commitId)
          if (!position) return null
          const sameCommitIndex = pointers.slice(0, index).filter(([, id]) => id === commitId).length
          const isHead = state.head.mode === 'branch' && state.head.ref === branch
          return (
            <span
              className={`graph-pointer${isHead ? ' head' : ''}`}
              key={branch}
              style={{ left: position.x + nodeSize + 8, top: position.y - 1 + sameCommitIndex * (compact ? 19 : 23) }}
            >
              {isHead && <b>HEAD</b>}{branch}
            </span>
          )
        })}
        {state.head.mode === 'detached' && (() => {
          const position = positions.get(state.head.ref)
          return position ? <span className="graph-pointer head detached" style={{ left: position.x + nodeSize + 8, top: position.y - 1 }}><b>HEAD</b>separado</span> : null
        })()}
        <span className="graph-scale" style={{ '--lanes': lanes.length } as CSSProperties}>EL PASADO <i /> EL PRESENTE</span>
      </div>
    </div>
  )
}
