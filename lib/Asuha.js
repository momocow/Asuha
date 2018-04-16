const http = require('http')
const https = require('https')

const getMidware = require('./midware')

const S_TYPE = Symbol('type')
const S_ARG = Symbol('serverArg')

class Asuha {
  constructor (type, arg) {
    this.server = null
    this.sio = null
    this.midware = null
    this.config = {}
    this._listeners = {}

    this[S_TYPE] = type
    this[S_ARG] = arg
  }

  set (config, value) {
    switch (arguments.length) {
      case 1:
        Object.assign(this.config, config)
        break
      case 2:
        this.config[`${config}`] = value
    }

    return this
  }

  listen (...args) {
    this.midware = getMidware(this.config)
    Object.keys(this._listeners).forEach((event) => {
      this._listeners[event].forEach((listener) => {
        this.midware.on(event, listener)
      })
    })

    this.midware.emit('debug', 'Midware options: %o', this.midware.options)

    switch (this[S_TYPE]) {
      case Asuha.TYPE.EXPRESS:
        this.server = this[S_ARG].use(this.midware)
        break
      case Asuha.TYPE.HTTPS:
        this.server = https.createServer(this[S_ARG], this.midware)
        break
      default:
      case Asuha.TYPE.HTTP:
        this.server = http.createServer(this.midware.bind(this.midware))
    }

    this.server = this.server.listen(...args)

    return this
  }

  on (event, listener) {
    if (!Array.isArray(this._listeners[event])) {
      this._listeners[event] = []
    }
    this._listeners[event].push(listener)
    return this
  }

  once (event, listener) {
    if (!Array.isArray(this._listeners[event])) {
      this._listeners[event] = []
    }
    this._listeners[event].push(listener)
    return this
  }

  off (event, listener) {
    if (this.midware) {
      if (typeof listener === 'function') {
        this.midware.removeListener(event, listener)
      } else {
        this.midware.removeAllListeners(event)
      }
    }
    return this
  }

  static midware (options) {
    return getMidware(options)
  }

  static http () {
    return new Asuha(Asuha.TYPE.HTTP)
  }

  static https (options) {
    return new Asuha(Asuha.TYPE.HTTPS, options)
  }

  /**
   * Create an express server or using an existing express app
   */
  static express (app = require('express')()) {
    return new Asuha(Asuha.TYPE.EXPRESS, app)
  }
}

Asuha.TYPE = {
  HTTP: 0,
  HTTPS: 1,
  EXPRESS: 2
}

module.exports = Asuha
