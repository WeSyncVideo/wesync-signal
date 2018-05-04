interface Message {
  payload: any
  event: string
}

/**
 * TODO: Documentation
 */
export interface Channel {
  participants: Participants
  state: 'ready' | 'pending' | 'rejected' | 'accepted'
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
