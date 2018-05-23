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
import * as R from 'ramda'

import { omitFirstBy, createChannelError, getOtherUuid, debug, createSignalError } from './utils'
import { Message } from './types/shared'
import {
  ServerOptions,
  Channels,
  Participants,
  Peers,
  Socket,
  Shroud,
  Context,
} from './types/server'

// Defaults
const DEFAULT_PORT = 3030

// Symbols (used to abstract away interior state from public API)
// Purpose: Fewer issues opened due to people relying on non-public API
const SHROUD_ACCESSOR = Symbol('accessor for shroud (state shared between peers)')
const LISTENERS_ACCESSOR = Symbol('accessor for listener functions (exposed for tests)')

/**
 * TODO:
 */
enum PeerPosition {
  INDUCER = 0,
  TARGET = 1,
}

const listeners = {
  onConnect (this: Shroud, socket: Socket) {
    const context = {
      socket,
      shroud: this,
      peerUuid: '',
    }

    socket.on('register', R.bind(listeners.onRegister, context))
  },

  onRegister (this: Context) {
    // Check if the peer is already registered
    if (this.peerUuid) {
      const error = createSignalError('server_error')
      return void this.socket.emit('error', error)
    }

    // If not create unique uuid (guaranteed uniqueness)
    do {
      this.peerUuid = uuidv4()
    } while (this.shroud.peers[this.peerUuid])
    this.shroud.peers[this.peerUuid] = { socket: this.socket }

    // Setup listeners
    this.socket.on('open_channel', R.bind(listeners.onOpenChannel, this))
    this.socket.on('target_channel_ack', R.bind(listeners.onTargetChannelAck, this))
    this.socket.on('inducer_channel_ack', R.bind(listeners.onInducerChannelAck, this))
    this.socket.on('send_message', R.bind(listeners.onSendMessage, this))
    this.socket.on('disconnect', R.bind(listeners.onDisconnect, this))

    // Inform peer they have registered and give them their uuid
    return void this.socket.emit('registered', { peerUuid: this.peerUuid })
  },

  onOpenChannel (this: Context, { targetUuid }: { targetUuid?: string }) {
    const channelId = `${this.peerUuid}-${targetUuid}`
    // Check if target peer exists
    if (!this.shroud.peers[targetUuid]) {
      const error = createChannelError(channelId, 'no_such_peer', 'no such peer')
      return void this.socket.emit('error', error)
    }
    // Check if channel already exists
    if (s.channels[channelId]) {
      const error = createChannelError(channelId, 'channel_already_exists')
      return void this.socket.emit('error', error)
    }
    // Create channel
    this.shroud.channels[channelId] = {
      participants: [this.peerUuid, targetUuid],
      state: 'pending',
      buffer: [],
    }

    // Send channel offer to target
    const { socket: targetSocket } = this.shroud.peers[targetUuid]
    targetSocket.emit('offer_channel', { channelId })

  },

  onTargetChannelAck (this: Context, { channelId, accepted }: { channelId?: string, accepted?: boolean }) {
    if (!this.shroud.channels[channelId]) {
      const error = createChannelError(channelId, 'no_such_channel')
      return void this.socket.emit('error', error)
    }
    const inducerUuid = getOtherUuid(this.peerUuid, this.shroud.channels[channelId].participants)
    const { socket: inducerSocket } = this.shroud.peers[inducerUuid]
    s.channels[channelId].state = accepted ? 'accepted' : 'rejected'
    inducerSocket.emit('response', { channelId, accepted })

  },

  /**
   * Called when the peer acknowledges channel creation
   * @param this
   * @param payload - TODO:
   */
  onInducerChannelAck (this: Context, { channelId }: { channelId?: string }) {
    if (!channelId || !this.shroud.channels[channelId]) {
      const error = createChannelError(channelId, 'no_such_channel')
      return void this.socket.emit('error', error)
    }
    const channel = this.shroud.channels[channelId]
    if (channel.state === 'accepted') {
      const { buffer } = channel
      buffer.map(message => this.socket.emit('message', { message, channelId }))
      channel.state = 'ready'
    }
  },

  /**
   * Called when peer attempts to send a message
   * @param this - TODO:
   * @param payload -
   */
  onSendMessage (this: Context, { channelId, message }: { channelId?: string, message?: Message }) {
    if (!channelId) {
      const error = createSignalError('invalid_request', 'channelId must be valid string')
      return void this.socket.emit('error', error)
    }
    const channel = this.shroud.channels[channelId]
    if (!channel) {
      const error = createChannelError(channelId, 'no_such_channel', `no such channel with uuid '${channelId}'`)
      return void this.socket.emit('error', error)
    }
    if (!message || !message.event || !message.payload) {
      const error = createChannelError(channelId, 'invalid_message', "message must have 'event' and 'payload'")
      return void this.socket.emit('error', error)
    }
    switch (channel.state) {
      case 'accepted': {
        // Should only occur with channel target, if so buffer messages
        if (this.peerUuid === channel.participants[PeerPosition.TARGET]) {
          channel.buffer = R.append(message)(channel.buffer)
        } else {
          debug(`the inducer '${this.peerUuid}' attempted to send a message to channel before it is ready`)
        }
      } break

      case 'ready': {
        // Forward the message
        const { participants } = channel
        const targetUuid = getOtherUuid(this.peerUuid, participants)
        const targetPeer = this.shroud.peers[targetUuid]
        if (!targetPeer) {
          const error = createChannelError(channelId, 'no_such_peer', `no such peer with uuid ${targetUuid}`)
          return void this.socket.emit('error', error)
        }
        const { socket: targetSocket } = targetPeer
        targetSocket.emit('message', { channelId, message })
      } break

      case 'rejected':
      case 'pending':
      default: {
        // This should not occur, debug the occurance
        debug(`'${this.peerUuid}' attempted to send message to '${channel.state}' channel '${channelId}'`)
      } break
    }
  },

  /**
   * Called when peer disconnects, remove them from pool
   *
   * @param this - TODO:
   */
  onDisconnect (this: Context) {
    this.shroud.peers = R.omit([this.peerUuid])(this.shroud.peers)

    // FIXME: Need to clean up ALL channels with peer in it
    this.shroud.channels = omitFirstBy(
      ([first, second]: Participants) => first === this.peerUuid || second === this.peerUuid,
    )(this.shroud.channels)
  },
}

/**
 * TODO:
 * @param param0
 * @param cb
 */
function listen ({ port = DEFAULT_PORT, ioOpts = {} }: ServerOptions = {}, cb?: Function) {
  const shroud: Shroud = {
    peers: {},
    channels: {},
  }
  const httpServer = http.createServer()
  ;(httpServer as any)[SHROUD_ACCESSOR] = shroud

  io(httpServer, ioOpts).on('connect', R.bind(listeners.onConnect, shroud))

  httpServer.listen(port, cb || function () {
    console.log(`socket.io server listening on http://localhost:${port}`)
  })

  return httpServer
}

export const Server = Object.create(
  {
    [LISTENERS_ACCESSOR]: {
      ...listeners,
    },
  },
  {
    listen: {
      value: listen,
    },
  },
) as {
  listen: typeof listen
}
