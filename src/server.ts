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

import { bind, createError } from './utils'

type Socket = SocketIO.Socket

const DEFAULT_PORT = 3030

const first = 0, second = 1

interface ServerOptions {
  port?: number
  ioOpts?: SocketIO.ServerOptions
}

interface Peer {
  socket: Socket
}

interface Channel {
  participants: [string, string]
}

interface Peers {
  [key: string]: Peer
}

interface Channels {
  [key: string]: Channel
}

function listen ({ port = DEFAULT_PORT, ioOpts = {} }: ServerOptions = {}) {
  const httpServer = http.createServer()
  const peers: Peers = {}
  const channels: Channels = {}

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

          inducerSocket.emit('channel_created', { uuid: channelUuid })
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
        delete peers[inducerUuid]
      })

      // Inform peer they have registered and give them their uuid
      inducerSocket.emit('registered', { uuid: inducerUuid })
    })
  })

  httpServer.listen(port, function () {
    console.log(`socket.io server listening on http://localhost:${port}`)
  })
}

export default listen
