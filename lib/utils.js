const { format } = require('util')

class AssertError extends Error {
  constructor (msg = '') {
    super('Assertion failed: ' + msg)
    this.name = 'AssertError'
  }
}

module.exports.assert = function (value, ...msg) {
  if (!value) {
    throw new AssertError(format(...msg))
  }
}
