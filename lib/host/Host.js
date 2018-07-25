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
 * @prop {boolean|string[]} ipWhitelist true to bypass all checks, false to fail all checks
 */

/**
 * @abstract
 */
class Host {
  /**
   * @param {HostConfig} configs
   */
  constructor (name, configs) {
    this.name = name
    /**
     * @type {HostConfig}
     */
    this.config = Object.assign({}, Host.DEFAULT_CONFIG, configs)

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
    assert(new RegExp(this.config.agentSignature).test(req.headers['user-agent']))
    assert(this.config.ipWhitelist)

    if (typeof this.config.ipWhitelist !== 'boolean') {
      const clientIP = getIP(req).clientIp
      assert(this.config.ipWhitelist.filter(whitelisted => {
        return cidrSubnet(whitelisted.includes('/') ? whitelisted : whitelisted + '/32')
          .contains(clientIP)
      }).length > 0)
    }
  }

  getEvent (req) {
    return req.headers[this.config.eventHeader]
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
  ipWhitelist: false,
  subscribedEvents: false
}

module.exports = Host
