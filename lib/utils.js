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

/**
 * @param {string} gitUrl Git clone URL of the repository, regardless of HTTP(s) or SSH
 */
module.exports.parseGitUrl = module.exports.parseGitURL = function (gitUrl) {
  const [ ,, host = '', fullname = '', name = '' ] = gitUrl.match(/^(https?:\/\/|git@)(.*?)[:/]([a-zA-Z\-_]+\/([a-zA-Z\-_]+))\.git$/) || []
  return { host, fullname, name }
}

module.exports.mixin = function (destination, source) {
  for (var k in source) {
    if (source.hasOwnProperty(k)) {
      destination[k] = source[k]
    }
  }
  return destination
}
