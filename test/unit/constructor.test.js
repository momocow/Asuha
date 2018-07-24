const Asuha = require('../..')

const contain = require('./helpers/contain')

const { test } = require('ava')
const { EventEmitter } = require('events')

test('Asuha class', function (t) {
  t.plan(1)
  t.true(contain(Asuha.prototype, EventEmitter.prototype))
})

test('new Asuha()', function (t) {
  t.plan(2)
  const asuha = new Asuha()
  t.is(typeof asuha, 'function')
  t.is(asuha.name, '__call__')
})
