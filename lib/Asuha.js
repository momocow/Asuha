const Callable = require('callable-instance')
const { EventEmitter } = require('events')
const http = require('http')
const https = require('https')

const { mixin, parseGitUrl } = require('./utils')

const BitBucket = require('./host/Bitbucket')

class Asuha extends Callable {
  constructor () {
    super('__call__')
    EventEmitter.call(this)

    /**
     * @type {http.Server}
     */
    this._server = null

    /**
     * @type {Map<string,Map<string, (string|RegExp)[]|boolean>>}
     */
    this._repoMap = new Map()
  }

  /**
   * @param {string} url
   * @param {{subscribedEvents: (string|RegExp)[]|boolean}}
   */
  addRepo (url, { subscribedEvents = [ 'push' ] } = {}) {
    const { fullname, host } = parseGitUrl(url)
    let hostMap = this._repoMap.get(host)
    if (!hostMap) {
      hostMap = new Map()
      this._repoMap.set(host, hostMap)
    }
    hostMap.set(fullname, subscribedEvents)
    return this
  }

  /**
   * @param {string} host
   * @param {string} fullname
   */
  removeRepo (host, fullname) {
    if (arguments.length === 0) {
      this._repoMap.clear()
      return true
    }

    if (arguments.length === 1) {
      const { host: _host, fullname: _fname } = parseGitUrl(host)
      host = _host
      fullname = _fname
    }

    const hostMap = this._repoMap.get(host)
    let ret = false
    if (hostMap) {
      ret = hostMap.delete(fullname)

      if (hostMap.size === 0) {
        this._repoMap.delete(host)
      }
    }
    return ret
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
  async __call__ (req, res, next) {
    next = next || function (err) {
      if (err) {
        res.writeHead(500, {
          'Content-Type': 'text/plain'
        })
        res.write('Oops', function () {
          res.end()
        })
        return
      }

      res.writeHead(400, {
        'Content-Type': 'text/plain'
      })
      res.write('Orphan Request', function () {
        res.end()
      })
    }

    for (let _host of Asuha.HOSTS) {
      try {
        _host.claim(req)

        let eventData
        try {
          eventData = await _host.parse()
        } catch (e) {
          this.emit('error', e)
          next(e)
          return
        }

        const hostdns = _host.getDomainName()
        const { fullname, commits, event } = eventData
        const hostMap = this._repoMap.get(hostdns)
        if (hostMap) {
          const repoMap = hostMap.get(fullname)
          if (repoMap) {
            if (
              repoMap === true ||
              repoMap.filter((_ev) => {
                return new RegExp(_ev).test(event)
              }).length > 0
            ) {
              this.emit('remote', hostdns, fullname, event, commits)
            }
          }
        }
        return next()
      } catch (e) {
        continue
      }
    }

    next()
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

Asuha.HOSTS = [ new BitBucket() ]

mixin(Asuha.prototype, EventEmitter.prototype)

module.exports = Asuha
