import * as io from 'socket.io-client'
import * as R from 'ramda'

import { bind } from './utils'
import { SignalError, Message } from './types'

interface PeerOptions {
  host: string
  port?: number
}

type PeerEvent = 'channel' | 'error'

type ErrorListener = Listener<SignalError>
type ChannelListener = Listener<Channel>
type PeerListener
  = ErrorListener
  | ChannelListener

type OnError = (this: PeerInstance, ev: 'error', fn: ErrorListener) => void
type OnChannel = (this: PeerInstance, ev: 'channel', fn: ChannelListener) => void
type OnPeer
  = OnError
  | OnChannel

type RemoveErrorListener = (this: PeerInstance, ev: 'error', fn: ErrorListener) => void
type RemoveChannelListener = (this: PeerInstance, ev: 'channel', fn: ChannelListener) => void
type RemoveListener
  = RemoveErrorListener
  | RemoveChannelListener

interface PeerInstance {
  uuid: string
  on: OnPeer
  removeListener: RemoveListener
  _peerListeners: ListenerMap
  openChannel (uuid: string): Promise<Channel>
}

type Listener<T> = (payload: T) => void

type MessageMap = Record<string, Message>

type ListenerMap<KeyType extends string = string> = Record<KeyType, Listener<any>[]>

interface Channel {
  _neglectedMessages: MessageMap
  _listeners: ListenerMap<PeerEvent>
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

Peer.prototype.on = function (this: PeerInstance, event: PeerEvent, fn: PeerListener) {
  if (event !== 'error' && event !== 'channel') {
    throw new Error(`no such event: ${event}`)
  }

  this._peerListeners[event] = R.append(fn)(this._peerListeners[event])
}

Peer.prototype.removeListener = function (this: PeerInstance, event: PeerEvent, fn: PeerListener) {
  if (event !== 'error' && event !== 'channel') {
    throw new Error(`no such event: ${event}`)
  }

  this._peerListeners[event] = R.without([fn])(this._peerListeners[event])
}

Peer.prototype.openChannel = function openChannel (this: PeerInstance) {
  return new Promise<Channel>((resolve, reject: Reject) => {

  })
}

function maybePort (port?: number) {
  return typeof port === 'undefined' ? '' : `:${port}`
}

export default Peer
