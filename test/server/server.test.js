'use strict'
const { expect } = require('chai')
const io = require('socket.io-client')
const R = require('ramda')

const { resolveRoot, uuidRegex } = require('../utils')

const port = 12580

describe('Server Tests', function () {
  it('should import server successfully', function () {
    require(resolveRoot('server.js'))
  })

  describe('with import', function () {
    beforeEach(async function () {
      this.serverRunning = true
      this.sockets = []
      this.Server = require(resolveRoot('server.js')).Server
      this.app = await promisifyListen(this.Server, { port })
      this.shroud = this.app.__shroud
      this.closeServer = createCloseServer(this, 'app', 'serverRunning')
      this.closeClients = createCloseClients(this)
      this.connect = createConnect(this)
    })

    afterEach(async function () {
      if (this.serverRunning) await this.closeServer()
      this.closeClients()
    })

    it('should start and stop server successfully', async function () {
      expect(this.shroud).to.be.ok
      expect(getPeerLength(this.app)).to.eq(0)
      expect(getChannelLength(this.app)).to.eq(0)
    })

    it('should accept peer connections', async function () {
      await this.connect()
    })

    describe('registration', function () {
      it('should successfully register single peer', async function () {
        return R.bind(test, this)(1)
      })

      it('should successfully register multiple peers', async function () {
        return R.bind(test, this)(4)
      })

      async function test (num) {
        const peers = await Promise.all(R.map(() => this.connect())(R.range(0, num)))
        const promises = peers.map(socket => new Promise(resolve => {
          socket.on('registered', peer => {
            expect(peer).to.be.ok
            expect(peer.peerUuid).to.match(uuidRegex)
            expect(getPeerLength(this.app)).to.eq(num)
            expect(getChannelLength(this.app)).to.eq(0)
            resolve()
          })
        }))
        peers.forEach(p => p.emit('register'))

        return Promise.all(promises)
      }
    })

    describe('opening channel', function () {

      async function test () {

      }
    })

    describe('cleaning up', function () {

      async function test () {

      }
    })
  })
})


function getPeerLength (app) {
  return getShroudPropLength('peers', app)
}

function getChannelLength (app) {
  return getShroudPropLength('channels', app)
}

function promisifyListen (Server, opts = {}) {
  return new Promise((resolve, reject) => {
    const app = Server.listen(opts, err => {
      err ? reject(err) : resolve(app)
    })
  })
}

var getShroudPropLength = R.curry((propName, app) => {
  return R.pipe(
    R.path(['__shroud', propName]),
    R.keys,
    R.length,
  )(app)
})

function createConnect (self) {
  function connect () {
    return new Promise((resolve, reject) => {
      const socket = io.connect(`http://localhost:${port}`)
      socket.on('error', err => reject(err))
      socket.on('connect', () => resolve(socket))
      this.sockets = R.append(socket)(this.sockets)
    })
  }

  return R.bind(connect, self)
}

function createCloseClients (self) {
  function closeClients () {
    R.map(
      s => s.close(),
    )(this.sockets)
    this.sockets = []
  }

  return R.bind(closeClients, self)
}

function createCloseServer (self, target, flag) {
  function closeServer (target, flag) {
    return new Promise(resolve => {
      if (this[flag]) {
        this[target].close(() => {
          this[flag] = false
          resolve()
        })
      } else {
        resolve()
      }
    })
  }

  return R.pipe(
    R.bind(R.__, self),
    R.partial(R.__, [target, flag])
  )(closeServer)
}
