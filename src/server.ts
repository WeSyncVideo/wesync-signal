/*
 * Terminology
 * ===========
 *
 * Inducer - The peer who initiates a channel between two peers
 * Target - A peer who is the target of the inducer
 */

import * as io from 'socket.io'
import * as http from 'http'
import * as uuidv4 from 'uuid/v4'
import { Observable } from 'rxjs/Observable'

import { bind, createError } from './utils'

type Socket = SocketIO.Socket

const DEFAULT_PORT = 3030

interface ServerOptions {
  port?: number
  ioOpts?: SocketIO.ServerOptions
}

interface Peer {
  socket: Socket
}

interface Peers {
  [key: string]: Peer
}

function listen ({ port = DEFAULT_PORT, ioOpts = {} }: ServerOptions = {}) {
  const httpServer = http.createServer()
  const peers: Peers = {}

  io(httpServer, ioOpts).on('connect', function (inducerSocket) {
    inducerSocket.on('handshake', function (inducerUuid) {

      peers[inducerUuid] = { socket: inducerSocket }

      inducerSocket.on('disconnect', function () {
        delete peers[inducerUuid]
      })

      inducerSocket.on('channel', function (targetUuid) {
        const targetSocket = peers[targetUuid]
        if (!targetSocket) {
          inducerSocket.emit(
            'error',
            createError('no_such_peer', `the peer '${targetUuid}' does not exist`),
          )

          return
        }

        inducerSocket.on('message', function (data) {
          const { payload, event } = data
          if (!data || !event) {
            inducerSocket.emit(
              'error',
              createError('invalid_message', `emit must have 'payload' and 'event' properties`)
            )
          }
        })
      })
    })
  })

  httpServer.listen(port, function () {
    console.log(`socket.io server listening on http://localhost:${port}`)
  })
}

class Test {
  private io: SocketIO.Server | null
  private _port: number
  private _ioOpts: SocketIO.ServerOptions
  private _peers: Peers

  constructor ({ port = DEFAULT_PORT, ioOpts = {} }: ServerOptions = {}) {
    // Bindings
    this.listen = bind(this.listen, this)
    this._onConnect = bind(this._onConnect, this)

    // Init
    this._port = port
    this._ioOpts = ioOpts
    this.io = null
    this._peers = {}
  }

  public listen () {
    if (!this.io) {
      const httpServer = http.createServer()
      this.io = io(httpServer, this._ioOpts)
      httpServer.listen(this._port)
      httpServer.on('connect', this._onConnect)
    }
  }

  private _onConnect (socket: Socket) {
    socket.on('handshake', this._onHandshake)
  }

  private _onHandshake (inducerUuid: string, socket: Socket) {
    if (!inducerUuid) throw new Error('invalid id')

    if (!this._peers[inducerUuid]) {
      this._peers[inducerUuid] = { socket }
    }

    socket.on('channel', targetUuid => this._onChannel(inducerUuid, targetUuid, socket))
  }

  private _onChannel (inducerUuid: string, targetUuid: string, inducerSocket: Socket) {
    // TODO: Shouldn't need the target uuid after this point (pass socket to handlers)
    const toSocket = this._peers[targetUuid]
    if (!toSocket) {
      const err = createError('no_such_peer', 'The peer you requested does not exist')
      inducerSocket.emit('error', err)
    }
  }

  /**
   * Offers are messages sent from the initiator
   *
   *
   */
  private _onOffer (targetSocket: Socket) {

  }

  private _onResponse () {

  }
}

new Server().listen()

module.exports = Server
