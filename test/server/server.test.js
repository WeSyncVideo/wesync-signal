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

  describe('imported', function () {
    beforeEach(function () {
      this.Server = require(resolveRoot('server.js')).Server
      const serverProto = Object.getPrototypeOf(this.Server)
      const [listenerAccessor] = Object.getOwnPropertySymbols(serverProto)
      this.listeners = serverProto[listenerAccessor]
    })

    afterEach(function () {
      this.Server = null
    })

    it(`should expose 'listen' function`, function () {
      const { listen } = this.Server
      expect(listen).to.be.a('function', `listen was of type: '${typeof listen}'`)
    })

    it('should hide listeners on prototype for testing', function () {
      expect(this.listeners).to.be.a('object', `listeners were of type: '${typeof this.listeners}'`)
      Object.keys(this.listeners).forEach(name => {
        const listener = this.listeners[name]
        expect(listener).be.a('function', `${name} listener was of type: '${typeof listener}'`)
      })
    })
  })
})
