const _get = require('lodash.get')

const Host = require('./Host')

/**
 * @typedef {Object} RepoInfo
 * @prop {string} name
 * @prop {string} fullname
 * @prop {string} owner
 * @prop {string} event
 * @prop {{ hash: string, message: string, author: string, timestamp: Date }[]} commits
 */

class Bitbucket extends Host {
  constructor () {
    super('Bitbucket', {
      agentSignature: /^Bitbucket-Webhooks/,
      eventHeader: 'x-event-key',
      domainname: 'bitbucket.org',
      ipWhitelist: [
        '104.192.136.0/21',
        '34.198.203.127',
        '34.198.178.64',
        '34.198.32.85'
      ]
    })
  }

  /**
   * @override
   * @return {Promise<RepoInfo>}
   */
  async parse (req) {
    const body = await super.parse(req)

    return {
      name: _get(body, 'repository.name', ''),
      fullname: _get(body, 'repository.full_name', ''),
      owner: _get(body, 'repository.owner.username', ''),
      event: req.headers[this.config.eventHeader],
      // empty array if event is not `repo:push`
      commits: _get(body, 'push.changes[0].commits', []).map(function (commit) {
        return {
          hash: _get(commit, 'hash', ''),
          message: _get(commit, 'message', ''),
          author: _get(commit, 'author.raw', ''),
          timestamp: new Date(commit.date)
        }
      })
    }
  }
}

module.exports = Bitbucket
