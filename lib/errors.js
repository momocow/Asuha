const { format } = require('util')

class LocalRepoNotFoundError extends Error {
  constructor (dns, fullname) {
    super(format('No corresponding local repository is found for the remote (%s:%s).', dns, fullname))
  }
}

module.exports = {
  LocalRepoNotFoundError
}
