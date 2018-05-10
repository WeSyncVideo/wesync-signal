const { expect } = require('chai')
const jsdomSetup = require('jsdom-global')

const { resolveRoot } = require('../utils')

describe('Peer Tests', function () {

  before(function () {
    this.cleanup = jsdomSetup()
  })

  it('should import peer successfully', function () {
    require(resolveRoot('peer.js'))
  })

  after(function () {
    this.cleanup()
  })
})
