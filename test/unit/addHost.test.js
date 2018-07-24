const { test } = require('ava')
const proxyquire = require('proxyquire')
const { stub } = require('sinon')

const _stub = stub()
const Asuha = proxyquire('../../lib/Asuha', {
  './host/Bitbucket': _stub
})

test('Asuha#addHost(host, options)', function (t) {
  t.plan(3)
  const asuha = new Asuha()
  asuha.addHost('bitbucket', { subscribedEvents: [ 'push' ] })
  t.true(_stub.calledOnce)
  t.true(_stub.firstCall.calledWith({ subscribedEvents: [ 'push' ] }))
  t.is(asuha._hosts.size, 1)
})
