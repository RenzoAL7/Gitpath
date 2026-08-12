import assert from 'node:assert/strict'
import test from 'node:test'
import { challenges } from '../src/data/challenges.ts'
import { createChallengeSession, runChallengeCommand } from '../src/lib/challenge-simulator.ts'

test('commit challenge advances main once per accepted commit', () => {
  const challenge = challenges.find(({ id }) => id === 'commit-basics')!
  let state = createChallengeSession(challenge)

  const wrong = runChallengeCommand(state, challenge, 'git branch feature')
  assert.equal(wrong.accepted, false)
  assert.equal(wrong.state.currentStep, 0)
  assert.equal(wrong.state.commits.length, 1)

  state = runChallengeCommand(state, challenge, 'git commit -m "crea README"').state
  state = runChallengeCommand(state, challenge, 'git commit -m "agrega perfil"').state

  assert.equal(state.completed, true)
  assert.equal(state.branches.main, 'c2')
  assert.deepEqual(state.commits.find(({ id }) => id === 'c2')?.parents, ['c1'])
})

test('branch challenge leaves main in place and advances feature', () => {
  const challenge = challenges.find(({ id }) => id === 'branch-basics')!
  let state = createChallengeSession(challenge)

  state = runChallengeCommand(state, challenge, 'git branch feature').state
  state = runChallengeCommand(state, challenge, 'git switch feature').state
  state = runChallengeCommand(state, challenge, 'git commit -m "crea perfil"').state

  assert.equal(state.completed, true)
  assert.equal(state.branches.main, 'c1')
  assert.equal(state.branches.feature, 'c2')
  assert.equal(state.head.ref, 'feature')
})

test('merge challenge creates a commit with two parents', () => {
  const challenge = challenges.find(({ id }) => id === 'merge-basics')!
  const state = createChallengeSession(challenge)
  const result = runChallengeCommand(state, challenge, 'git merge feature')
  const merge = result.state.commits.find(({ id }) => id === result.state.branches.main)!

  assert.equal(result.state.completed, true)
  assert.deepEqual(merge.parents, ['m1', 'f1'])
})

test('rebase replays feature commits and changes their ids', () => {
  const challenge = challenges.find(({ id }) => id === 'rebase-basics')!
  const state = createChallengeSession(challenge)
  const result = runChallengeCommand(state, challenge, 'git rebase main')

  assert.equal(result.state.completed, true)
  assert.equal(result.state.branches.feature, 'f2′')
  assert.deepEqual(result.state.commits.find(({ id }) => id === 'f1′')?.parents, ['m1'])
  assert.deepEqual(result.state.commits.find(({ id }) => id === 'f2′')?.parents, ['f1′'])
  assert.equal(result.state.commits.find(({ id }) => id === 'f2')?.lane, 'feature · antes')
})

test('detached HEAD leaves the main pointer untouched', () => {
  const challenge = challenges.find(({ id }) => id === 'detached-head')!
  const state = createChallengeSession(challenge)
  const result = runChallengeCommand(state, challenge, 'git switch --detach c1')

  assert.equal(result.state.completed, true)
  assert.deepEqual(result.state.head, { mode: 'detached', ref: 'c1' })
  assert.equal(result.state.branches.main, 'c2')
})
