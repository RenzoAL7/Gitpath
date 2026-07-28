import assert from 'node:assert/strict'
import test from 'node:test'
import { lessons } from '../src/data/lessons.ts'
import { createSession, runCommand } from '../src/lib/git-simulator.ts'

test('first commit follows working tree, staging and commit order', () => {
  const lesson = lessons.find(({ id }) => id === 'first-commit')!
  let session = createSession(lesson)

  const wrong = runCommand(session, lesson, 'git commit -m "too soon"')
  assert.equal(wrong.accepted, false)
  assert.equal(wrong.state.currentStep, 0)
  assert.equal(wrong.state.feedback.tone, 'error')

  session = runCommand(session, lesson, 'git status').state
  session = runCommand(session, lesson, 'git add .').state
  const completed = runCommand(session, lesson, 'git commit -m "docs: update guide"')

  assert.equal(completed.accepted, true)
  assert.equal(completed.state.completed, true)
  assert.equal(completed.state.workingTree, 'clean')
  assert.equal(completed.state.staged, false)
})

test('revert creates a new commit instead of deleting the bad one', () => {
  const lesson = lessons.find(({ id }) => id === 'revert-release')!
  let session = createSession(lesson)

  session = runCommand(session, lesson, 'git status').state
  const result = runCommand(session, lesson, 'git revert HEAD')

  assert.equal(result.accepted, true)
  assert.equal(result.state.commits.length, 2)
  assert.notEqual(result.state.head, lesson.start.head)
})

test('merge conflict requires staging the resolution before the merge commit', () => {
  const lesson = lessons.find(({ id }) => id === 'resolve-conflict')!
  let session = createSession(lesson)

  session = runCommand(session, lesson, 'git switch feat/checkout').state
  session = runCommand(session, lesson, 'git merge main').state
  assert.equal(session.workingTree, 'conflict')

  const prematureCommit = runCommand(session, lesson, 'git commit -m "merge: resolve checkout"')
  assert.equal(prematureCommit.accepted, false)
  assert.equal(prematureCommit.state.currentStep, 2)

  session = runCommand(session, lesson, 'git add src/checkout.ts').state
  const completed = runCommand(session, lesson, 'git commit -m "merge: resolve checkout"')
  assert.equal(completed.state.completed, true)
})
