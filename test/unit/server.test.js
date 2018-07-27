const { test } = require('ava')
const Asuha = require('../..')

const { stub } = require('sinon')
const http = require('http')

test('Asuha#listen()', function (t) {
  t.plan(1)

  const FAKE_SERVER = {
    fake: true,
    listen: function () { }
  }

  const _stub = stub(http, 'createServer')
  _stub.returns(FAKE_SERVER)

  const asuha = Asuha.http()

  t.is(asuha.server(), FAKE_SERVER)
})
