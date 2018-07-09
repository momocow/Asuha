const { join } = require('path')

const REPO = {
  name: 'Dummy',
  host: 'bitbucket.org',
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

const REPO_PATH = join(__dirname, 'fixture')

const ACTIONS = [
  'echo done'
]
const CONFIG = {
  host: 'localhost'
}

const { name } = require('../package.json')

const test = require('ava')
const { readFileSync, mkdirSync, existsSync, writeFileSync } = require('fs')
const { request } = require('http')
const { setTimeout } = require('../util/timer')
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

function mockRemote (port, headers = {}) {
  return new Promise(function (resolve, reject) {
    const req = request({
      protocol: 'http:',
      hostname: CONFIG.host,
      port: port,
      method: 'POST',
      headers: {
        ...headers,
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

function asuhaListen (asuha, port) {
  return new Promise(function (resolve) {
    onDebug('Start Asuha listening for remote git events')
    asuha.listen(port, CONFIG.host, function () {
      const { port, address } = asuha.server.address()
      onDebug('Asuha is listening at %s:%d', address, port)
      resolve()
    })
  })
}

process.on('uncaughtException', function (err) {
  onError(err)
})

test.before(function (t) {
  const dotGit = join(__dirname, 'fixture', '.git')
  const gitConfig = join(dotGit, 'config')

  if (!existsSync(dotGit) || !existsSync(gitConfig)) {
    mkdirSync(dotGit)
    writeFileSync(gitConfig, `[remote "origin"]
    url = git@bitbucket.org:momocow/dummy.git`, { encoding: 'utf8' })
  }
})

test.beforeEach(function (t) {
  t.context.asuha = Asuha.http()
    .set('actions', ACTIONS)
    .set('cwd', __dirname)
    .set('stdio.stdout', null)
    .set('whitelistIPs', true) // allow all ips (since we mock the Bitbucket webhook payload from localhost)
    .on('debug', onDebug)
})

test.afterEach.cb(function (t) {
  t.plan(0)
  t.context.asuha.close(function () {
    t.end()
  })
})

test(`Asuha should report the following events in order: [
  "init",
  "remote",
  "actions.pre",
  "action.pre",
  "action.post",
  "actions.post",
  "done"
]`, function (t) {
  onDebug('Event test:')
  return Promise.resolve((function () {
    t.context.asuha
      .on('error', function (err) {
        onError(err)
        t.fail('Unexpected error occurs.')
      })
      .on('init', function (repoPath, fullname, host) {
        t.is(repoPath, REPO_PATH)
        t.is(fullname, REPO.fullname)
        t.is(host, 'bitbucket.org')
        onDebug('#init')
      })
      .on('remote', function (repo) {
        t.deepEqual(repo, REPO)
        onDebug('#remote')
      })
      .on('actions.pre', function (repo, actions, repoPath) {
        t.deepEqual(repo, REPO)
        t.deepEqual(actions, ACTIONS)
        t.is(repoPath, REPO_PATH)
        onDebug('#actions.pre')
      })
      .on('actions.post', function (repo, actions, repoPath) {
        t.deepEqual(repo, REPO)
        t.deepEqual(actions, ACTIONS)
        t.is(repoPath, REPO_PATH)
        onDebug('#actions.post')
      })
      .on('action.pre', function (repo, action, repoPath) {
        t.deepEqual(repo, REPO)
        t.is(action, ACTIONS[0])
        t.is(repoPath, REPO_PATH)
        onDebug('#action.pre')
      })
      .on('action.post', function (repo, action, repoPath, { stdout, stderr }) {
        t.deepEqual(repo, REPO)
        t.is(action, ACTIONS[0])
        t.is(repoPath, REPO_PATH)
        t.true(stdout.startsWith('done'))
        t.falsy(stderr)
        onDebug('#action.post')
      })
      .on('done', function (repo) {
        t.deepEqual(repo, REPO)
        onDebug('#done')
      })
  })()).then(function () {
    return asuhaListen(t.context.asuha, 7766)
  }).then(function () {
    return mockRemote(7766)
  }).then(function (status) {
    t.is(status, 200)
    onDebug('#Status: %d', status)
  })
})

test.cb('Async listeners should be executed in the order they were defined.', function (t) {
  onDebug('Init listeners test:')
  t.plan(2)

  const ret = []
  const start = Date.now()
  t.context.asuha.on('init', async function () {
    ret.push(await setTimeout(() => 1, 2000))
    onDebug('Init event #1: %d ms', Date.now() - start)
  })
    .on('init', function () {
      ret.push(2)
      onDebug('Init event #2: %d ms', Date.now() - start)
    })
    .on('init', async function () {
      ret.push(await setTimeout(() => 3, 3000))
      onDebug('Init event #3: %d ms', Date.now() - start)
    })
    .listen(function () {
      t.deepEqual(ret, [ 1, 2, 3 ])
      t.true((Date.now() - start) > 5000)
      t.end()
    })
})

test(`Asuha#claim() should
claim the repository,
emit 'claim' and 'init' event in order,
and listen for remote Git events of the repository.`, function (t) {
  onDebug('Claim test:')
  t.plan(3)

  let claimed = false
  t.context.asuha
    .set('autoScan', false)
    .on('claim', function () {
      t.pass()
      claimed = true
    }).on('init', function () {
      t.true(claimed)
    })

  return asuhaListen(t.context.asuha, 7767)
    .then(function () {
      return t.context.asuha.claim(join(__dirname, 'fixture'))
    }).then(function () {
      return mockRemote(7767)
    }).then(function (status) {
      t.is(status, 200)
      onDebug('#Status: %d', status)
    })
})
