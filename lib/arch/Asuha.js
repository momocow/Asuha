const Callable = require('callable-instance')
const { EventEmitter } = require('events')
const http = require('http')
const https = require('https')

const { mixin, parseGitUrl } = require('./utils')

const BitBucket = require('./host/Bitbucket')

class Asuha extends Callable {
  /**
   * @param {string[]} gitRemoteUrls
   */
  constructor (gitRemoteUrls) {
    super('__call__')
    EventEmitter.call(this)

    /**
     * @type {http.Server}
     */
    this._server = null

    /**
     * @type {Map<string,Map<string, string>>}
     */
    this._repoMap = new Map()

    /**
     * @type {Host[]}
     */
    this._hosts = []

    this.addUrl(...gitRemoteUrls)
  }

  /**
   * @param {string[]} urls
   */
  addUrl (...urls) {
    urls.forEach(_url => {
      const { fullname, host } = parseGitUrl(_url)
      let hostMap = this._repoMap.get(host)
      if (!hostMap) {
        hostMap = new Map()
        this._repoMap.set(host, hostMap)
      }
      hostMap.set(fullname, _url)
    })
    return this
  }

  /**
   * @param {string} host
   * @param {string} fullname
   */
  removeUrl (host, fullname) {
    const hostMap = this._repoMap.get(host)
    if (hostMap) {
      return hostMap.delete(fullname)
    }
    return false
  }

  /**
   * @param {"bitbucket"} hostKey
   * @param {string} event
   */
  subscribe (hostKey, event) {
    const remote = Asuha.REMOTES[hostKey.toUpperCase()]
    if (remote) {
      if (typeof remote.config.subscribeEvents === 'boolean') {
        remote.config.subscribeEvents = []
      }
      remote.config.subscribeEvents.push(event)
    }
    return this
  }

  /**
   * @param {"bitbucket"} hostKey
   * @param {string} events
   */
  unsubscribe (hostKey, event) {
    const remote = Asuha.REMOTES[hostKey.toUpperCase()]
    if (remote) {
      if (typeof remote.config.subscribeEvents === 'boolean') {
        return this
      }
      remote.config.subscribeEvents.splice(remote.config.subscribeEvents.indexOf(event), 1)
    }
    return this
  }

  /**
   * @param {"bitbucket"} hostKey
   */
  addHost (hostKey) {
    const remote = Asuha.REMOTES[hostKey.toUpperCase()]
    if (remote) {
      this._hosts.push(remote)
    }
    return this
  }

  /**
   * @param {"bitbucket"} hostKey
   */
  removeHost (hostKey) {
    const remote = Asuha.REMOTES[hostKey.toUpperCase()]
    if (remote) {
      const idx = this._hosts.indexOf(remote)
      if (idx >= 0) {
        this._hosts.splice(idx, 1)
      }
    }
    return this
  }

  listen (...args) {
    if (this._server) {
      this._server.listen(...args)
    }
    return this
  }

  server () {
    return this._server
  }

  /**
   * @param {http.IncomingMessage} req
   * @param {http.ServerResponse} res
   * @param {(err?: Error) => void} next
   */
  async __call__ (req, res, next = function () {}) {
    for (let _host of this._hosts) {
      try {
        _host.claim(req)

        let eventData
        try {
          eventData = await _host.parse()
        } catch (e) {
          this.emit('error', e)
          return
        }

        const hostdns = _host.getDomainName()
        const { fullname, commits } = eventData
        const hostMap = this._repoMap.get(hostdns)
        if (hostMap && hostMap.has(fullname)) {
          this.emit('remote', hostdns, fullname, commits)
          return
        }
      } catch (e) {
        continue
      }
    }
  }

  static http () {
    const ins = new Asuha()
    ins._server = http.createServer(ins)
    return ins
  }

  static https (options = {}) {
    const ins = new Asuha()
    ins._server = https.createServer(options, ins)
    return ins
  }
}

Asuha.REMOTES = {
  BITBUCKET: new BitBucket({
    subscribeEvents: [ 'push' ]
  })
}

mixin(Asuha.prototype, EventEmitter.prototype)

module.exports = Asuha
