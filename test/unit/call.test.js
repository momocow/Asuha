const Asuha = require('../..')

const { test } = require('ava')
const request = require('supertest')

const PAYLOAD = require('./fixture/payload.json')

const HTTPS_URL = 'https://bitbucket.org/momocow/dummy.git'
const BITBUCKET_AGENT = 'Bitbucket-Webhooks/2.0'
const BITBUCKET_SERVER_IP = '34.198.203.127'

const FAKE_AGENT = 'Fake-Agent'
const FAKE_SERVER_IP = '1.2.3.4'

test.cb('__call__(req, res): valid event from known hosts', function (t) {
  t.plan(4)
  const asuha = new Asuha()
    .addRepo(HTTPS_URL)
    .on('remote', (host, fullname, event, commits) => {
      t.is(host, 'bitbucket.org')
      t.is(fullname, 'momocow/dummy')
      t.is(event, 'repo:push')
      t.deepEqual(commits, [{
        hash: '4046c77a57e94b157d47ae0dd23574c657141579',
        message: 'msg',
        author: 'momocow <momocow.me@gmail.com>',
        timestamp: new Date('2018-04-16T08:33:08+00:00')
      }])
    })

  request(asuha)
    .post('/')
    .type('application/json')
    .set('User-Agent', BITBUCKET_AGENT)
    .set('X-Event-Key', 'repo:push')
    .set('X-FORWARDED-FOR', BITBUCKET_SERVER_IP)
    .send(PAYLOAD)
    .expect(200)
    .then(() => {
      t.end()
    })
    .catch(err => {
      t.end(err)
    })
})

test.cb('__call__(req, res): valid event from unknown hosts', function (t) {
  t.plan(0)
  const asuha = new Asuha()
    .addRepo(HTTPS_URL)

  request(asuha)
    .post('/')
    .type('application/json')
    .set('User-Agent', FAKE_AGENT)
    .set('X-Event-Key', 'push')
    .set('X-FORWARDED-FOR', FAKE_SERVER_IP)
    .send(PAYLOAD)
    .expect(400)
    .then(() => {
      t.end()
    })
    .catch(err => {
      t.end(err)
    })
})

test.cb('__call__(req, res): invalid event from known hosts', function (t) {
  t.plan(0)
  const asuha = new Asuha()
    .addRepo(HTTPS_URL, { subscribedEvents: false })

  request(asuha)
    .post('/')
    .type('application/json')
    .set('User-Agent', BITBUCKET_AGENT)
    .set('X-Event-Key', 'repo:push')
    .set('X-FORWARDED-FOR', BITBUCKET_SERVER_IP)
    .send(PAYLOAD)
    .expect(400)
    .then(() => {
      t.end()
    })
    .catch(err => {
      t.end(err)
    })
})

test.cb('__call__(req, res): broken payload', function (t) {
  t.plan(1)
  const asuha = new Asuha()
    .addRepo(HTTPS_URL)
    .on('error', (err) => {
      t.true(err instanceof Error)
    })

  request(asuha)
    .post('/')
    .type('application/json')
    .set('User-Agent', BITBUCKET_AGENT)
    .set('X-Event-Key', 'repo:push')
    .set('X-FORWARDED-FOR', BITBUCKET_SERVER_IP)
    .send('{')
    .expect(500)
    .then(() => {
      t.end()
    })
    .catch(err => {
      t.end(err)
    })
})
