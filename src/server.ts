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

import { removeFirstBy, omitFirstBy, createChannelError, getOtherUuid, debug, createSignalError } from './utils'
import { SignalError, ErrorType, ChannelError, Message } from './types/shared'
import {
  Socket,
  Channel,
  ServerOptions,
  Channels,
  Participants,
  Peer,
  Peers,
} from './types/server'

const DEFAULT_PORT = 3030
const INDUCER = 0
const TARGET = 1

/**
 * TODO:
 * @param opts
 */
function listen ({ port = DEFAULT_PORT, ioOpts = {} }: ServerOptions = {}) {
  let peers: Peers = {}
  let channels: Channels = {}
  const httpServer = http.createServer()

  io(httpServer, ioOpts).on('connect', function (socket) {
    let peerUuid: string = ''

    // Called when a new peer registers with signal server
    socket.on('register', function () {
      // Check if the peer is already registered
      if (peerUuid) {
        const error: SignalError = {
          type: 'server_error',
        }
        return void socket.emit('error', error)
      }
      do {
        peerUuid = uuidv4()
      } while (peers[peerUuid])
      peers[peerUuid] = { socket }

      socket.on('open_channel', function ({ targetUuid }) {
        const channelId = `${peerUuid}-${targetUuid}`
        // Check if target peer exists
        if (!peers[targetUuid]) {
          const error = createChannelError(channelId, 'no_such_peer', 'no such peer')
          return void socket.emit('error', error)
        }
        // Check if channel already exists
        if (channels[channelId]) {
          const error = createChannelError(channelId, 'channel_already_exists')
          return void socket.emit('error', error)
        }
        // Create channel
        channels[channelId] = {
          participants: [peerUuid, targetUuid],
          state: 'pending',
          buffer: [],
        }

        // Send channel offer to target
        const { socket: targetSocket } = peers[targetUuid]
        targetSocket.emit('offer_channel', { channelId })
      })

      // Called when receiving response from target
      socket.on('target_channel_ack', function ({ channelId, accepted }: { channelId: string, accepted: boolean }) {
        if (!channels[channelId]) {
          const error = createChannelError(channelId, 'no_such_channel')
          return void socket.emit('error', error)
        }
        const inducerUuid = getOtherUuid(peerUuid, channels[channelId].participants)
        const { socket: inducerSocket } = peers[inducerUuid]
        channels[channelId].state = accepted ? 'accepted' : 'rejected'
        inducerSocket.emit('response', { channelId, accepted })
      })

      // Called when the peer acknowledges channel creation
      socket.on('inducer_channel_ack', function ({ channelId }) {
        if (!channels[channelId]) {
          const error = createChannelError(channelId, 'no_such_channel')
          return void socket.emit('error', error)
        }
        const channel = channels[channelId]
        if (channel.state === 'accepted') {
          const { buffer } = channel
          buffer.map(message => socket.emit('message', { message, channelId }))
          channel.state = 'ready'
        }
      })

      // Called when peer attempts to send a message
      socket.on('send_message', function ({ channelId, message }: { channelId?: string, message?: Message }) {
        if (!channelId) {
          const error = createSignalError('invalid_request', 'channelId must be valid string')
          return void socket.emit('error', error)
        }
        const channel = channels[channelId]
        if (!channel) {
          const error = createChannelError(channelId, 'no_such_channel', `no such channel with uuid '${channelId}'`)
          return void socket.emit('error', error)
        }
        if (!message || !message.event || !message.payload) {
          const error = createChannelError(channelId, 'invalid_message', "message must have 'event' and 'payload'")
          return void socket.emit('error', error)
        }
        switch (channel.state) {
          case 'accepted': {
            // Should only occur with channel target, if so buffer messages
            if (peerUuid === channel.participants[TARGET]) {
              channel.buffer = R.append(message)(channel.buffer)
            } else {
              debug(`the inducer '${peerUuid}' attempted to send a message to channel before it is ready`)
            }
          } break

          case 'ready': {
            // Forward the message
            const { participants } = channel
            const targetUuid = getOtherUuid(peerUuid, participants)
            const targetPeer = peers[targetUuid]
            if (!targetPeer) {
              const error = createChannelError(channelId, 'no_such_peer', `no such peer with uuid ${targetUuid}`)
              return void socket.emit('error', error)
            }
            const { socket: targetSocket } = targetPeer
            targetSocket.emit('message', { channelId, message })
          } break

          case 'rejected':
          case 'pending':
          default: {
            // This should not occur, debug the occurance
            debug(`'${peerUuid}' attempted to send message to '${channel.state}' channel '${channelId}'`)
          } break
        }
      })

      // Called when peer disconnects, remove them from pool
      socket.on('disconnect', function () {
        peers = R.omit([peerUuid])(peers)
        channels = omitFirstBy(
          ([first, second]: Participants) => first === peerUuid || second === peerUuid,
        )(channels)
      })

      // Inform peer they have registered and give them their uuid
      socket.emit('registered', { peerUuid })
    })
  })

  httpServer.listen(port, function () {
    console.log(`socket.io server listening on http://localhost:${port}`)
  })

  return httpServer
}

/**
 * Export the server object
 */
export const Server = {
  listen,
}
