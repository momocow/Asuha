const Asuha = require('../..')

const { test } = require('ava')

const HTTPS_URL = 'https://github.com/momocow/Asuha.git'
const ANOTHER_URL = 'https://github.com/momocow/node-cq-websocket.git'

test('Asuha#removeRepo(url)', function (t) {
  t.plan(2)
  const asuha = new Asuha()
  asuha.addRepo(HTTPS_URL)
  asuha.addRepo(ANOTHER_URL)
  asuha.removeRepo(HTTPS_URL)
  t.true(asuha._repoMap.has('github.com'))
  t.false(asuha._repoMap.get('github.com').has('momocow/Asuha'))
})

test('Asuha#removeRepo(host, fullname): by url', function (t) {
  t.plan(2)
  const asuha = new Asuha()
  asuha.addRepo(HTTPS_URL)
  asuha.addRepo(ANOTHER_URL)
  asuha.removeRepo('github.com', 'momocow/Asuha')
  t.true(asuha._repoMap.has('github.com'))
  t.false(asuha._repoMap.get('github.com').has('momocow/Asuha'))
})

test('Asuha#removeRepo(__): clean empty host map', function (t) {
  t.plan(1)
  const asuha = new Asuha()
  asuha.addRepo(HTTPS_URL)
  asuha.addRepo(ANOTHER_URL)
  asuha.removeRepo('github.com', 'momocow/Asuha')
  asuha.removeRepo('github.com', 'momocow/node-cq-websocket')
  t.false(asuha._repoMap.has('github.com'))
})

test('Asuha#removeRepo(): clean all', function (t) {
  t.plan(1)
  const asuha = new Asuha()
  asuha.addRepo(HTTPS_URL)
  asuha.addRepo(ANOTHER_URL)
  asuha.removeRepo()
  t.is(asuha._repoMap.size, 0)
})
