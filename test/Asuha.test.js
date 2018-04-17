const REPO = {
  name: 'Dummy',
  fullname: 'momocow/dummy',
  event: 'repo:push',
  owner: 'momocow',
  commits: [{
    hash: '4046c77a57e94b157d47ae0dd23574c657141579',
    message: 'msg',
    author: 'momocow <momocow.me@gmail.com>',
    timestamp: new Date('2018-04-16T08:33:08+00:00')
  }]
}

const ACTIONS = [
  'echo done'
]

const CONFIG = {
  host: 'localhost',
  port: 7766
}

const { name } = require('../package.json')

const test = require('ava')
const { readFileSync, mkdirSync, existsSync, writeFileSync } = require('fs')
const { join } = require('path')
const { request } = require('http')
const Asuha = require('..')

function onError (err) {
  console.error('\u001b[31m[Error] %O\u001b[39m', err)
}

function onDebug (...args) {
  // enable debug mode in DEBUG env variable
  if (process.env.DEBUG && new RegExp(process.env.DEBUG.replace('*', '.*')).test(name)) {
    console.debug('\u001b[90m[Debug] ' + args.shift() + '\u001b[39m', ...args)
  }
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
  .set('stdio.stdout', null)
  .set('whitelistIPs', true) // allow all ips (since we mock the Bitbucket webhook payload from localhost)
  .on('debug', onDebug)

test.before(function (t) {
  const dotGit = join(__dirname, 'fixture', '.git')
  const gitConfig = join(dotGit, 'config')

  if (!existsSync(dotGit) || !existsSync(gitConfig)) {
    mkdirSync(dotGit)
    writeFileSync(gitConfig, `[remote "origin"]
    url = git@bitbucket.org:momocow/dummy.git`, { encoding: 'utf8' })
  }
})

test.before.cb(function (t) {
  onDebug('Start Asuha listening for remote git events')
  t.plan(0)
  asuha.listen(CONFIG.port, CONFIG.host, function () {
    const { port, address } = asuha.server.address()
    onDebug('Asuha is listening at %s:%d', address, port)
    t.end()
  })
})

test(`Asuha should report the following events in order: [
  "remote",
  "actions.pre",
  "action.pre",
  "action.post",
  "actions.post",
  "done"
]`, function (t) {
  return Promise.all([
    new Promise(function (resolve, reject) {
      let eventCount = 0

      const onEvent = function () {
        eventCount++
        if (eventCount === 6) {
          resolve()
        }
      }

      asuha
        .on('error', function (err) {
          onError(err)
          t.fail('Unexpected error occurs.')
          reject(err)
        })
        .on('remote', function (repo) {
          t.deepEqual(repo, REPO)
          onDebug('#remote')
          onEvent()
        })
        .on('actions.pre', function (repo, actions) {
          t.deepEqual(repo, REPO)
          t.deepEqual(actions, ACTIONS)
          onDebug('#actions.pre')
          onEvent()
        })
        .on('actions.post', function (repo, actions) {
          t.deepEqual(repo, REPO)
          t.deepEqual(actions, ACTIONS)
          onDebug('#actions.post')
          onEvent()
        })
        .on('action.pre', function (repo, action) {
          t.deepEqual(repo, REPO)
          t.is(action, ACTIONS[0])
          onDebug('#action.pre')
          onEvent()
        })
        .on('action.post', function (repo, action, { stdout, stderr }) {
          t.deepEqual(repo, REPO)
          t.is(action, ACTIONS[0])
          t.true(stdout.startsWith('done'))
          t.falsy(stderr)
          onDebug('#action.post')
          onEvent()
        })
        .on('done', function (repo) {
          t.deepEqual(repo, REPO)
          onDebug('#done')
          onEvent()
        })
    }),
    mockRemote().then(function (status) {
      t.is(status, 200)
      onDebug('#Status: %d', status)
    })
  ])
})
