import * as io from 'socket.io-client'
import * as R from 'ramda'

import { bind } from './utils'
import { SignalError, Message } from './types/shared'
import {
  Channel,
  ChannelListener,
  ErrorListener,
  Listener,
  ListenerMap,
  MessageMap,
  OnChannel,
  OnError,
  OnPeer,
  PeerEvent,
  PeerInstance,
  PeerListener,
  PeerOptions,
  Reject,
  RemoveChannelListener,
  RemoveErrorListener,
  RemoveListener,
  Socket,
} from './types/peer'

export function Peer (this: PeerInstance, options: PeerOptions) {
  // Bindings
  this.on = bind(this.on, this)
  this.openChannel = bind(this.openChannel, this)

  return new Promise<typeof this>((resolve, reject: Reject) => {
    // Connect to server
    this._socket = io(`${options.host}${stringifyMaybePort(options.port)}`)

    this._socket.on('connect_error', () => reject({
      type: 'timeout',
      message: 'failed to connect to signal server',
    }))

    this._socket.on('connect', () => {
      this._socket.on('registered', ({ uuid: peerUuid }: { uuid: string }) => {
        this.uuid = peerUuid
        resolve(this)
      })
      this._socket.emit('register')
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

Peer.prototype.openChannel = function openChannel (this: PeerInstance, targetUuid: string) {
  return new Promise<Channel>((resolve, reject: Reject) => {
    this._socket.on('channel_created', function ({ uuid: channelUuid }: { uuid: string }) {
      // TODO: Create channel
    })
    this._socket.emit('create_channel', { uuid: targetUuid })
  })
}

function stringifyMaybePort (port?: number) {
  return typeof port === 'number'
    ? `:${port}`
    : ''
}
