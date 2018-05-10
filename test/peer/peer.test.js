const { expect } = require('chai')

const { resolveRoot } = require('../utils')

describe('Peer Tests', function () {
  it('should import peer successfully', function () {
    require(resolveRoot('peer.js'))
  })
})
