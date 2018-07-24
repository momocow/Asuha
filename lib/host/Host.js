const getIP = require('ipware')().get_ip
const { cidrSubnet } = require('ip')
const { promisify } = require('util')
const jsonBody = promisify(require('body/json'))

const { assert } = require('../utils')

/**
 * @typedef {Object} HostConfig
 * @prop {string|RegExp} agentSignature
 * @prop {string} eventHeader
 * @prop {string} domainname
 * @prop {boolean|string[]} whitelistIPs true to bypass all checks, false to fail all checks
 * @prop {boolean|string[]} subscribedEvents true to bypass all checks, false to fail all checks
 */

/**
 * @abstract
 */
class Host {
  /**
   * @param {...HostConfig} configs
   */
  constructor (name, ...configs) {
    this.name = name
    /**
     * @type {HostConfig}
     */
    this.config = Object.assign({}, Host.DEFAULT_CONFIG, ...configs)

    // headers of http.IncomingMessage are all in lowercase
    this.config.eventHeader = this.config.eventHeader.toLowerCase()
  }

  /**
   * @abstract
   */
  parse (req) {
    return jsonBody(req)
  }

  /**
   * @throws {AssertionError}
   */
  claim (req) {
    assert(
      new RegExp(this.config.agentSignature).test(req.headers['user-agent']),
      'The request is not from the host (%s). Header { User-Agent: %s }',
      this.name,
      req.headers['user-agent']
    )

    let switchMode = typeof this.config.subscribedEvents === 'boolean'
    assert(
      switchMode ? this.config.subscribedEvents
        : this.config.subscribedEvents
          .filter(subscribed => {
            return new RegExp(subscribed).test(req.headers[this.config.eventHeader])
          }).length > 0,
      switchMode ? 'All events are rejected due to config: { subscribedEvents: false }'
        : 'The request is not a subscribed event. Header { X-Event-Key: %s }',
      req.headers[this.config.eventHeader]
    )

    switchMode = typeof this.config.whitelistIPs === 'boolean'
    const clientIP = getIP(req).clientIp
    assert(
      switchMode ? this.config.whitelistIPs
        : this.config.whitelistIPs
          .filter(whitelisted => {
            return cidrSubnet(whitelisted.includes('/') ? whitelisted : whitelisted + '/32')
              .contains(clientIP)
          }).length > 0,
      switchMode ? 'All IPs are rejected due to config: { whitelistIPs: false }'
        : 'The request is not from a whitelisted IP (%s). Whitelist: %o',
      clientIP,
      this.config.whitelistIPs
    )
  }

  getDomainName () {
    return this.config.domainname
  }
}

/**
 * @type {HostConfig}
 */
Host.DEFAULT_CONFIG = {
  agent: 'Unknown',
  eventHeader: '',
  whitelistIPs: false,
  subscribedEvents: false
}

module.exports = Host
