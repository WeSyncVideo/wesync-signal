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

import { bind, createError, removeFirstBy, omitFirstBy } from './utils'
import { SignalError } from './types/shared'
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

const first = 0, second = 1

function getOtherUuid (uuid: string, participants: Participants) {
  return participants[first] === uuid ? participants[second] : participants[first]
}

export function listen ({ port = DEFAULT_PORT, ioOpts = {} }: ServerOptions = {}) {
  let peers: Peers = {}
  let channels: Channels = {}
  const httpServer = http.createServer()

  io(httpServer, ioOpts).on('connect', function (socket) {

    // Called when a new peer registers with signal server
    socket.on('register', function () {
      let uuid: string
      do {
        uuid = uuidv4()
      } while (peers[uuid])
      peers[uuid] = { socket }

      socket.on('open_channel', function ({ targetUuid }) {
        const channelId = `${uuid}-${targetUuid}`
        if (!peers[targetUuid]) {
          const error: SignalError = {
            message: 'no such peer',
            type: 'no_such_peer',
          }
          return void socket.emit('error', error)
        }
        if (channels[channelId]) {
          const error: SignalError = {
            type: 'server_error',
          }
          return void socket.emit('error', error)
        }
        channels[channelId] = {
          participants: [uuid, targetUuid],
          state: 'pending',
          buffer: [],
        }
        const { socket: targetSocket } = peers[targetUuid]
        targetSocket.emit('offer_channel', { channelId })
      })

      socket.on('target_channel_ack', function ({ channelId, accepted }: { channelId: string, accepted: boolean }) {
        if (!channels[channelId]) {
          const error: SignalError = {
            type: 'no_such_channel',
          }
          return void socket.emit('error', error)
        }
        if (!accepted) {
          // Peer has rejected request for channel
          channels[channelId].state = 'rejected'
        }
      })

      socket.on('inducer_channel_ack', function ({ channelId }) {

      })

      // Called when inducer attempts to send a message to a channel
      socket.on('send_message', function ({ channelUuid, event, payload }) {
        const channel = channels[channelUuid]
        if (!channel) {
          return void socket.emit('error', createError('no_such_channel', `no such channel with uuid '${channelUuid}'`))
        }
        if (!event || !payload) {
          return void socket.emit('error', createError('invalid_message', "message must have 'event' and 'payload'"))
        }
        const { participants } = channel
        const targetUuid = participants[first] === uuid ? participants[second] : participants[first]
        const targetPeer = peers[targetUuid]
        if (!targetPeer) {
          return void socket.emit('error', createError('no_such_peer', `no such peer with uuid ${targetUuid}`))
        }
        const { socket: targetSocket } = targetPeer
        targetSocket.emit('get_message', { channelUuid, event, payload })
      })

      // Called when peer disconnects, remove them from pool
      socket.on('disconnect', function () {
        peers = R.omit([uuid])(peers)
        channels = omitFirstBy(
          ([first, second]: Participants) => first === uuid || second === uuid,
        )(channels)
      })

      // Inform peer they have registered and give them their uuid
      socket.emit('registered', { uuid })
    })
  })

  httpServer.listen(port, function () {
    console.log(`socket.io server listening on http://localhost:${port}`)
  })

  return httpServer
}
