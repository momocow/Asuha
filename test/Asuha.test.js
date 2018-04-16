const path = require('path')
const TEST_CWD = path.join(__dirname, 'dummy')

const REPO = {
  fullname: 'momocow/dummy',
  event: 'repo:push',
  owner: 'momocow'
}

const ACTIONS = [
  'echo "done"'
]

const test = require('ava')
const { promisify } = require('util')
const exec = promisify(require('child_process').exec)
const git = require('simple-git/promise')(TEST_CWD)
const Asuha = require('..')

// const TIMEOUT = 10000

function onError (err) {
  console.error('\u001b[31m[Error] %O\u001b[39m', err)
}

function onDebug (...args) {
  console.debug('\u001b[90m[Debug] ' + args.shift() + '\u001b[39m', ...args)
}

async function makeCommit () {
  onDebug('Start making commit')

  const { stdout } = await exec('npm start', { cwd: TEST_CWD })
  const commitMsg = stdout
    .split('\n')
    .filter(function (line) {
      return line.includes('Test')
    })
    .join('')
    .replace('\n', '')
    .trim()

  await git.add('last-modified')
  const { commit } = await git.commit(commitMsg)
  await git.push()

  return commit + ': ' + commitMsg
}

process.on('uncaughtException', function (err) {
  onError(err)
})

const asuha = Asuha.http()
  .set('actions', ACTIONS)
  .set('cwd', __dirname)
  .on('debug', onDebug)

test.before.cb(function (t) {
  onDebug('Start Asuha listening for remote git events')
  t.plan(0)
  asuha.listen(7766, '0.0.0.0', function () {
    const { port, address } = asuha.server.address()
    onDebug('Asuha is listening at %s:%d', address, port)
    t.end()
  })
})

test.before(async function (t) {
  onDebug('Update test repository')

  await git.checkout('master')
  await git.pull()
})

test.cb('Asuha should report the following events in order: [remote, actions.pre, action.pre, action.post, actions.post, done]', function (t) {
  t.plan(12)
  let assertCount = 0
  asuha
    .on('error', function (err) {
      onError(err)
      t.fail('Unexpected error occurs.')
      t.end()
    })
    .on('remote', function (repo) {
      t.deepEqual(repo, REPO)
      assertCount += 1
      onDebug('#remote <assert: %d>', assertCount)
    })
    .on('actions.pre', function (repo, actions) {
      t.deepEqual(repo, REPO)
      t.deepEqual(actions, ACTIONS)
      assertCount += 2
      onDebug('#actions.pre <assert: %d>', assertCount)
    })
    .on('actions.post', function (repo, actions) {
      t.deepEqual(repo, REPO)
      t.deepEqual(actions, ACTIONS)
      assertCount += 2
      onDebug('#actions.post <assert: %d>', assertCount)
    })
    .on('action.pre', function (repo, action) {
      t.deepEqual(repo, REPO)
      t.is(action, ACTIONS[0])
      assertCount += 2
      onDebug('#action.pre <assert: %d>', assertCount)
    })
    .on('action.post', function (repo, action, { stdout, stderr }) {
      t.deepEqual(repo, REPO)
      t.is(action, ACTIONS[0])
      t.is(stdout, 'done')
      t.falsy(stderr)
      assertCount += 4
      onDebug('#action.post <assert: %d>', assertCount)
    })
    .on('done', function (repo) {
      t.deepEqual(repo, REPO)
      assertCount += 1
      onDebug('#done <assert: %d>', assertCount)
      t.end()
    })

  makeCommit().then(function (result) {
    onDebug('[Commit]\n    %s', result)
  })
})
