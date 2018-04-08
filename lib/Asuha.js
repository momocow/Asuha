const http = require('http')
const https = require('https')

const getMidware = require('./midware')

const S_TYPE = Symbol('type')
const S_ARG = Symbol('serverArg')

class Asuha {
  constructor (type, arg) {
    this.server = null
    this.config = {}

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
    const midware = getMidware(this.config)
    switch (this[S_TYPE]) {
      case Asuha.TYPE.EXPRESS:
        this.server = this[S_ARG].use(midware)
        break
      case Asuha.TYPE.HTTPS:
        this.server = https.createServer(this[S_ARG], midware)
        break
      default:
      case Asuha.TYPE.HTTP:
        this.server = http.createServer(midware)
    }

    this.server = this.server.listen(...args)

    return this.server
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
