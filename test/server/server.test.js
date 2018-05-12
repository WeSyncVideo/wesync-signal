const { expect } = require('chai')
const io = require('socket.io-client')

const { resolveRoot } = require('../utils')

describe('Server Tests', function () {
  it('should import server successfully', function () {
    require(resolveRoot('server.js'))
  })

  describe('with import', function () {
    beforeEach(function () {
      this.Server = require(resolveRoot('server.js')).Server
    })

    it('should start and stop server successfully', function (done) {
      const server = this.Server.listen({}, () => {
        server.close()
        expect(server.__closure).to.be.ok
        expect(peerLength(server)).to.eq(0)
        expect(channelLength(server)).to.eq(0)
        done()
      })
    })

    it('should successfully register peer', function (done) {

    })
  })
})

function peerLength (server) {
  return Object.keys(server.__closure.peers).length
}

function channelLength (server) {
  return Object.keys(server.__closure.channels).length
}
