const Host = require('./Host')

/**
 * @typedef {Object} BitbucketConfig
 * @prop {boolean|string[]} subscribeEvents true to bypass all checks, false to fail all checks
 */
/**
 * @typedef {Object} RepoInfo
 * @prop {string} name
 * @prop {string} fullname
 * @prop {string} owner
 */

class Bitbucket extends Host {
  /**
   * @param {BitbucketConfig} config
   */
  constructor (config) {
    super('Bitbucket', config, {
      agentSignature: /^Bitbucket-Webhooks/,
      eventHeader: 'x-event-key',
      domainname: 'bitbucket.org',
      whitelistIPs: [
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
      name: body.repository.name,
      fullname: body.repository.full_name,
      owner: body.repository.owner.username
    }
  }
}

module.exports = Bitbucket
