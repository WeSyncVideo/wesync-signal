const { expect } = require('chai')

const { resolveRoot } = require('../utils')

describe('Server Tests', function () {
  it('should not have window accessible', function () {
    expect(typeof window).to.be.eq('undefined')
  })

  it('should successfully import server', function () {
    require(resolveRoot('server.js'))
  })
})
