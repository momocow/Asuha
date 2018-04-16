const test = require('ava')
const { promisify } = require('util')
const exec = promisify(require('child_process').exec)
const path = require('path')
const git = require('simple-git/promise')(path.join(__dirname, 'dummy'))
const Asuha = require('..')

const REPO = {
  fullname: 'momocow/dummy',
  event: 'repo:push',
  owner: 'momocow'
}

const ACTIONS = [
  'echo "done"'
]

const TIMEOUT = 10000

function onError (err) {
  console.error('\u001b[31m[Error] %O\u001b[39m', err)
}

function onDebug (...args) {
  console.debug('\u001b[90m[Debug] ' + args.shift() + '\u001b[39m', ...args)
}

async function makeCommit () {
  const { stdout } = await exec('npm start')
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

const asuha = Asuha.http()
  .set('actions', ACTIONS)
  .on('debug', onDebug)

test.before.cb('Start Asuha listening for remote git events', function (t) {
  t.plan(0)
  asuha.listen(7766, '0.0.0.0', function () {
    const { port, address } = asuha.server.address()
    onDebug('Asuha is listening at %s:%d', address, port)
    t.end()
  })
})

test.before('Update test repository', async function (t) {
  await git.pull()
})

test.beforeEach.cb('Set timeout: ' + TIMEOUT + ' ms', function (t) {
  setTimeout(function () {
    t.end()
  }, TIMEOUT)
})

test.cb('Asuha should report the following events in order: [remote, actions.pre, action.pre, action.post, actions.post, done]', function (t) {
  t.plan(12)
  asuha
    .on('error', function (err) {
      onError(err)
      t.fail('Unexpected error occurs.')
      t.end()
    })
    .on('remote', function (repo) {
      t.deepEqual(repo, REPO)
    })
    .on('actions.pre', function (repo, actions) {
      t.deepEqual(repo, REPO)
      t.deepEqual(actions, ACTIONS)
    })
    .on('actions.post', function (repo, actions) {
      t.deepEqual(repo, REPO)
      t.deepEqual(actions, ACTIONS)
    })
    .on('action.pre', function (repo, action) {
      t.deepEqual(repo, REPO)
      t.is(action, ACTIONS[0])
    })
    .on('action.post', function (repo, action, { stdout, stderr }) {
      t.deepEqual(repo, REPO)
      t.is(action, ACTIONS[0])
      t.is(stdout, 'done')
      t.falsy(stderr)
    })
    .on('done', function (repo) {
      t.deepEqual(repo, REPO)
      t.end()
    })

  makeCommit().then(function (result) {
    onDebug('[Commit]\n    %s', result)
  })
})
