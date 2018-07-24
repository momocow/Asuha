const Asuha = require('../..')

const { test } = require('ava')

const SSH_URL = 'git@github.com:momocow/Asuha.git'
const HTTPS_URL = 'https://github.com/momocow/Asuha.git'

test('Asuha#addRepo(https_url): by HTTPS URL', function (t) {
  t.plan(2)
  const asuha = new Asuha()
  asuha.addRepo(HTTPS_URL)
  t.true(asuha._repoMap.has('github.com'))
  t.true(asuha._repoMap.get('github.com').has('momocow/Asuha'))
})

test('Asuha#addRepo(ssh_url): by SSH URL', function (t) {
  t.plan(2)
  const asuha = new Asuha()
  asuha.addRepo(SSH_URL)
  t.true(asuha._repoMap.has('github.com'))
  t.true(asuha._repoMap.get('github.com').has('momocow/Asuha'))
})
