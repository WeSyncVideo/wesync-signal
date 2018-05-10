const { expect } = require('chai')

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
      console.log(this.Server)
      const server = this.Server.listen(() => {
        server.close()
        done()
      })
    })
  })
})
