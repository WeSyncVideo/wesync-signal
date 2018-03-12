import * as io from 'socket.io'
import * as http from 'http'
import * as uuidv4 from 'uuid/v4'

import { bind } from './utils'

type Socket = SocketIO.Socket

const DEFAULT_PORT = 3030

interface ServerOptions {
  port?: number
  ioOpts?: SocketIO.ServerOptions
}

interface Peer {
  uuid: string
  socket: Socket
}

interface Peers {
  [key: string]: Peer
}

class Server {
  private io: SocketIO.Server | null
  private _port: number
  private _ioOpts: SocketIO.ServerOptions
  private _peers: Peers;

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

  private _onHandshake (uuid: string, socket: Socket) {

  }

  private _onChannel (uuid: string, socket: Socket) {
    if (!uuid) throw new Error('invalid id')

    if (!this._peers[uuid]) {
      this._peers[uuid] = { uuid, socket }
    }
  }

  private _onOffer () {

  }

  private _onResponse () {

  }
}

new Server().listen()

module.exports = Server
