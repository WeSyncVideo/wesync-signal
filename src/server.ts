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

function listen ({ port = DEFAULT_PORT, ioOpts = {} }: ServerOptions = {}) {
  let peers: Peers = {}
  let channels: Channels = {}
  const httpServer = http.createServer()

  io(httpServer, ioOpts).on('connect', function (inducerSocket) {

    /**
     * Called when a new peer registers with signal server
     */
    inducerSocket.on('register', function () {
      let inducerUuid: string
      do {
        inducerUuid = uuidv4()
      } while (peers[inducerUuid])
      peers[inducerUuid] = { socket: inducerSocket }

      /**
       * Called when inducer attempts to create a channel
       */
      inducerSocket.on('create_channel', function ({ uuid: targetUuid }) {
        if (!peers[targetUuid]) {
          inducerSocket.emit('no_such_peer', `no such peer with uuid '${targetUuid}'`)
        }
        const { socket: targetSocket } = peers[targetUuid]
        { let channelUuid: string
          do {
            channelUuid = uuidv4()
          } while (channels[channelUuid])
          channels[channelUuid] = {
            participants: [inducerUuid, targetUuid]
          }

          targetSocket.on('new_channel_ack', function (err: string) {
            if (err) {
              inducerSocket.emit(`${targetUuid}_channel_not_created`, err)
              // TODO: Don't mutate channels
              delete channels[channelUuid]
              // TODO: Clean up channels when peer disconnects
            } else {
              inducerSocket.emit('channel_created', { uuid: channelUuid })
            }
          })

          // Inform the target that a channel has been created
          targetSocket.emit('new_channel', { uuid: channelUuid })
        }
      })

      /**
       * Called when inducer attempts to send a message to a channel
       */
      inducerSocket.on('send_message', function ({ channelUuid, event, payload }) {
        const channel = channels[channelUuid]
        if (!channel) {
          return void inducerSocket.emit('error', createError('no_such_channel', `no such channel with uuid '${channelUuid}'`))
        }
        if (!event || !payload) {
          return void inducerSocket.emit('error', createError('invalid_message', "message must have 'event' and 'payload'"))
        }
        const { participants } = channel
        const targetUuid = participants[first] === inducerUuid ? participants[second] : participants[first]
        const targetPeer = peers[targetUuid]
        if (!targetPeer) {
          return void inducerSocket.emit('error', createError('no_such_peer', `no such peer with uuid ${targetUuid}`))
        }
        const { socket: targetSocket } = targetPeer
        targetSocket.emit('get_message', { channelUuid, event, payload })
      })

      /**
       * Called when peer disconnects, remove them from pool
       */
      inducerSocket.on('disconnect', function () {
        peers = R.omit([inducerUuid])(peers)
        channels = omitFirstBy(
          ([first, second]: Participants) => first === inducerUuid || second === inducerUuid,
        )(channels)
      })

      // Inform peer they have registered and give them their uuid
      inducerSocket.emit('registered', { uuid: inducerUuid })
    })
  })

  httpServer.listen(port, function () {
    console.log(`socket.io server listening on http://localhost:${port}`)
  })

  return httpServer
}

export default listen
