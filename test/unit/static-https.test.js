const Asuha = require('../..')

const { test } = require('ava')
const { stub } = require('sinon')
const https = require('https')

test('Asuha.https(): should create a HTTPS server wrapped inside the Asuha instance.', function (t) {
  t.plan(3)

  const _stub = stub(https, 'createServer')

  const httpsOptions = {
    cert: 'fake-cert',
    key: 'fake-private-key'
  }
  const asuha = Asuha.https(httpsOptions)

  t.true(_stub.calledOnce)
  t.true(_stub.firstCall.calledWith(httpsOptions, asuha))
  t.is(asuha._server, _stub.firstCall.returnValue)
})
