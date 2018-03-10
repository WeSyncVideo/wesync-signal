WeSync Signal
=============

A simple, no-logs signaling server designed for the WeSync video platform to connect peers.

Installing
==========

```
// Yarn
yarn add wesync-signal

// npm
npm i --save wesync-signal
```

Importing
=========

```
// Require
const { Server, Peer } = require('wesync-signal')
const Server = require('wesync-signal/server')
const Peer = require('wesync-signal/peer')

// ES6 Modules
import { Server, Peer } from 'wesync-signal'
import Server from 'wesync-signal/server'
import Peer from 'wesync-signal/peer'
```

API
===

## Server

```
const Server = require('wesync-signal/server')

const server = new Server().listen()
```

## Client

```
// Both
const Peer = require('wesync-signal/peer')

new Peer({
  host: 'http://signalserverhost.com',  // Example host
  port: 3030,                           // Example port
}).catch(err => {

}).then(peer => {
  // Get your uuid
  peer.uuid

  // Listen for other peers opening channel to you
  peer.on('channel', channel => {
    channel.emit('some-event', 'myPayload')

    channel.on('response-event', payload => {

    })
  })

  // Open channel with other users
  peer
    .channel('416ac246-e7ac-49ff-93b4-f7e94d997e6b')
    .catch(err => {

    })
    .then(channel => {

    })
})

peer
  .on('error', err => {
    err.type
    err.message
  })
  .then(uuid => {
    // UUID for peer
  })

// Peer
peer.offer(
  '109156be-c4fb-41ea-b1b4-efe1671c5836',
  offerPayload,
  responsePayload => {
    // response callback may be called multiple times (up to host)
    // Used to renegotiate
  }
)

// Host
peer
  .on('offer', (offerPayload, respond) => {
    // May call respond more than once (renegotiate)
    respond(responsePayload)
  })
```

### Options

- `host: string` - Host for the signaling server
- `port: number` - Port for the signaling server

### Errors

- `timeout` - Timed out establishing connection
