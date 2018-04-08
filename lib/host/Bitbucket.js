const Host = require('./Host')

/**
 * @typedef {Object} BitbucketConfig
 * @prop {boolean|string[]} whitelistIPs true to bypass all checks, false to fail all checks
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
      domainname: 'bitbucket.org'
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
