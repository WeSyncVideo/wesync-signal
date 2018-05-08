import * as io from 'socket.io-client'
import * as R from 'ramda'

import { bind } from './utils'
import {
  Channel,
  PeerEvent,
  PeerInstance,
  PeerListener,
  PeerOptions,
  Reject,
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
      this._socket.on('registered', ({ uuid }: { uuid: string }) => {
        this.uuid = uuid
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

/**
 * Stringify a possible port
 *
 * @param port conditional port to stringify
 */
function stringifyMaybePort (port?: number) {
  return typeof port === 'number'
    ? `:${port}`
    : ''
}
