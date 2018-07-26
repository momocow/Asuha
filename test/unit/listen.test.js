const { test } = require('ava')
const Asuha = require('../..')

const { stub } = require('sinon')
const http = require('http')

test.cb('Asuha#listen()', function (t) {
  t.plan(1)

  const _stub = stub(http, 'createServer')
  const _stub2 = stub()
  const asuha = Asuha.http()

  _stub.returns({
    listen: _stub2
  })

  _stub2.callsFake(function (cb) {
    cb()
  })

  asuha.listen(function () {
    t.true(_stub2.calledOnce)
    t.end()
  })
})
