const Asuha = require('../..')

const { test } = require('ava')

test('Asuha#removeHost(host)', function (t) {
  t.plan(2)
  const asuha = new Asuha()
  asuha.addHost('bitbucket')
  t.true(asuha.removeHost('bitbucket'))
  t.is(asuha._hosts.size, 0)
})
