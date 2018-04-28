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
const { listen, Peer } = require('wesync-signal')
const { listen } = require('wesync-signal/server')
const { Peer } = require('wesync-signal/peer')

// ES6 Modules
import { Server, Peer } from 'wesync-signal'
import { listen } from 'wesync-signal/server'
import { Peer } from 'wesync-signal/peer'
```

API
===

## Server

```
const { listen } = require('wesync-signal/server')

const opts = {
  port: 3030
}

const server = new Server(opts).listen()
```

### Options

- `port?: number` - Port to listen on (default TODO:)

## Client

```
// Both
const { Peer } = require('wesync-signal/peer')

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
    .openChannel('416ac246-e7ac-49ff-93b4-f7e94d997e6b')
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
```

### Options

- `host: string` - Host for the signaling server
- `port: number` - Port for the signaling server

### Errors

- `timeout` - Timed out establishing connection
