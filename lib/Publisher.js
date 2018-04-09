const { isPrivate } = require('ip')
const getIP = require('ipware')().get_ip

class Publishable {
  publish () { }
}

class Publisher extends Publishable {
  /**
   * @param {SocketIO.Server} sio
   */
  constructor (sio, config) {
    super()

    this.sio = sio
    this.subscMap = {}

    this.sio.on('connection', (sock) => {
      if (!config.expose && !isPrivate(getIP(sock.request).clientIp)) {
        sock.disconnect(true)
        return
      }

      sock.on('subscribe', (remoteHost, repoFullname) => {
        sock.join(this.room(remoteHost, repoFullname))
      })
    })
  }

  publish (remoteHost, repoFullname, event, ...args) {
    this.sio.in(this.room(remoteHost, repoFullname)).emit(event, ...args)
  }

  room (remoteHost, repoFullname) {
    return `${remoteHost}:${repoFullname}`
  }
}

module.exports = {
  Publisher,
  Publishable
}
