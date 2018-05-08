interface Message {
  payload: any
  event: string
}

type ChannelState
  // Channel has been initialized, but neither peer is aware of it's existence
  = 'pending'
  // The target peer has accepted the channel, unknown to the inducer
  | 'accepted'
  // The target peer has rejected the channel, unknown to the inducer
  | 'rejected'
  // The target peer has acccepted the channel, and the inducer is aware of this
  | 'ready'

/**
 * TODO: Documentation
 */
export interface Channel {
  participants: Participants
  state: ChannelState
  buffer: Message[]
}

/**
 * TODO: Documentation
 */
export interface Peers {
  [key: string]: Peer
}

/**
 * TODO: Documentation
 */
export interface Channels {
  [key: string]: Channel
}

/**
 * TODO: Documentation
 */
export interface ServerOptions {
  port?: number
  ioOpts?: SocketIO.ServerOptions
}

/**
 * TODO: Documentation
 */
export interface Peer {
  socket: Socket
}

/**
 * TODO: Documentation
 */
export type Socket = SocketIO.Socket

/**
 * TODO: Documentation
 */
export type Participants = [string, string]
