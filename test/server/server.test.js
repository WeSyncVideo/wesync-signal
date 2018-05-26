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


})
