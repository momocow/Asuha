const REPO = {
  fullname: 'momocow/dummy',
  event: 'repo:push',
  owner: 'momocow'
}

const ACTIONS = [
  'echo "done"'
]

const CONFIG = {
  host: 'localhost',
  port: 7766
}

const test = require('ava')
const { readFileSync } = require('fs')
const { join } = require('path')
const { request } = require('http')
const Asuha = require('..')

function onError (err) {
  console.error('\u001b[31m[Error] %O\u001b[39m', err)
}

function onDebug (...args) {
  console.debug('\u001b[90m[Debug] ' + args.shift() + '\u001b[39m', ...args)
}

function mockRemote () {
  return new Promise(function (resolve, reject) {
    const req = request({
      protocol: 'http:',
      hostname: CONFIG.host,
      port: CONFIG.port,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Bitbucket-Webhooks/2.0',
        'X-Event-Key': 'repo:push'
      }
    }, function (res) {
      resolve(res.statusCode)
    })

    req.on('error', function (err) {
      reject(err)
    })

    req.write(readFileSync(join(__dirname, 'fixture', 'payload.json'), 'utf8'))
    req.end()
  })
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
  asuha.listen(CONFIG.port, CONFIG.host, function () {
    const { port, address } = asuha.server.address()
    onDebug('Asuha is listening at %s:%d', address, port)
    t.end()
  })
})

test.cb('Asuha should report the following events in order: [remote, actions.pre, action.pre, action.post, actions.post, done]', async function (t) {
  t.plan(13)
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
      t.is(stdout, 'done\n')
      t.falsy(stderr)
      assertCount += 4
      onDebug('#action.post <assert: %d>', assertCount)
    })
    .on('done', function (repo) {
      t.deepEqual(repo, REPO)
      assertCount += 1
      onDebug('#done <assert: %d>', assertCount)
    })

  const status = await mockRemote()
  t.is(status, 200)
  t.end()
})
