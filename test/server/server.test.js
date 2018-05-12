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
      this.clientRunning = false
      this.Server = require(resolveRoot('server.js')).Server
      this.app = await promisifyListen(this.Server, { port })
      this.closure = this.app.__closure
      this.closeServer = __closeServer(this, 'app', 'serverRunning')
      this.closeClient = __closeClient(this, 'socket', 'clientRunning')
      this.connect = __connect(this)
    })

    afterEach(async function () {
      if (this.serverRunning) await this.closeServer()
      if (this.clientRunning) this.closeClient()
    })

    it('should start and stop server successfully', async function () {
      expect(this.closure).to.be.ok
      expect(getPeerLength(this.app)).to.eq(0)
      expect(getChannelLength(this.app)).to.eq(0)
    })

    it('should accept peer connections', async function () {
      await this.connect()
    })

    it('should successfully register peer', async function () {
      await this.connect()
      return new Promise(resolve => {
        this.socket.on('registered', p => {
          expect(p).to.be.ok
          expect(p.peerUuid).to.match(uuidRegex)
          expect(getPeerLength(this.app)).to.eq(1)
          expect(getChannelLength(this.app)).to.eq(0)
          resolve()
        })
        this.socket.emit('register')
      })
    })
  })
})


function getPeerLength (app) {
  return getClosurePropLength('peers', app)
}

function getChannelLength (app) {
  return getClosurePropLength('channels', app)
}

function promisifyListen (Server, opts = {}) {
  return new Promise((resolve, reject) => {
    const app = Server.listen(opts, err => {
      err ? reject(err) : resolve(app)
    })
  })
}

var getClosurePropLength = R.curry((propName, app) => {
  return R.pipe(
    R.path(['__closure', propName]),
    R.keys,
    R.length,
  )(app)
})

function __connect (self) {
  function connect () {
    return new Promise((resolve, reject) => {
      const socket = io.connect(`http://localhost:${port}`)
      socket.on('error', err => reject(err))
      socket.on('connect', () => resolve(socket))
      this.socket = socket
      this.clientRunning = true
    })
  }

  return R.bind(connect, self)
}

function __closeClient (self, target, flag) {
  function closeClient (target, flag) {
    if (this[flag]) {
      this[flag] = false
      this[target].close()
    }
  }

  return R.pipe(
    R.bind(R.__, self),
    R.partial(R.__, [target, flag])
  )(closeClient)
}

function __closeServer (self, target, flag) {
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
