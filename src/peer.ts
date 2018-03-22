import * as io from 'socket.io-client'
import * as R from 'ramda'

import { bind } from './utils'
import { SignalError, Message } from './types'

interface PeerOptions {
  host: string
  port?: number
}

type PeerEvent = 'channel' | 'error'

type OnPeer
  = ((this: PeerInstance, ev: 'error', fn: (err: SignalError) => void) => void)
  | ((this: PeerInstance, ev: 'channel', fn: (channel: Channel) => void) => void)

interface PeerInstance {
  uuid: string
  on: OnPeer
  openChannel (uuid: string): Promise<Channel>
}

type Listener<T> = (payload: T) => void

interface MessageMap {
  [key: string]: Message[]
}

interface ListenerMap {
  [key: string]: Listener<any>[]
}

interface Channel {
  _neglectedMessages: MessageMap
  _listeners: ListenerMap
  emit<T> (ev: string, payload: T): void
  on<T> (ev: string, fn: (payload: T) => void): void
}

type Reject = (err: SignalError) => void

function Peer (this: PeerInstance, options: PeerOptions) {
  // Bindings
  this.on = bind(this.on, this)
  this.openChannel = bind(this.openChannel, this)

  return new Promise<typeof this>((resolve, reject: Reject) => {
    // Connect to server
    const socket = io(`${options.host}${maybePort(options.port)}`)

    socket.on('connect_error', () => reject({
      type: 'timeout',
      message: 'failed to connect to signal server',
    }))

    socket.on('connect', () => {
      socket.on('registered', (peerUuid: string) => {
        this.uuid = peerUuid
        resolve(this)
      })
      socket.emit('register')
    })
  })
}

Peer.prototype.on = function (event, fn) {
  return {}
}

Peer.prototype.openChannel = function openChannel (this: PeerInstance) {
  return new Promise<Channel>((resolve, reject: Reject) => {

  })
}

function maybePort (port?: number) {
  return typeof port === 'undefined' ? '' : `:${port}`
}

export default Peer
