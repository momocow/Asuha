const Asuha = require('../..')

const { test } = require('ava')
const { stub } = require('sinon')
const http = require('http')

test('Asuha.http(): should create a HTTP server wrapped inside the Asuha instance.', function (t) {
  t.plan(3)
  const _stub = stub(http, 'createServer')
  const asuha = Asuha.http()
  t.true(_stub.calledOnce)
  t.true(_stub.firstCall.calledWith(asuha))
  t.is(asuha._server, _stub.firstCall.returnValue)
})
