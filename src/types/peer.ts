import { Message, SignalError } from './shared'

/**
 * TODO: Documentation
 */
export interface PeerOptions {
  host: string
  port?: number
}

/**
 * TODO: Documentation
 */
export interface PeerInstance {
  uuid: string
  on: OnPeer
  removeListener: RemoveListener
  _socket: Socket
  _peerListeners: ListenerMap
  openChannel (uuid: string): Promise<Channel>
}

/**
 * TODO: Documentation
 */
export interface Channel {
  _neglectedMessages: MessageMap
  _listeners: ListenerMap<PeerEvent>
  emit<T> (ev: string, payload: T): void
  on<T> (ev: string, fn: (payload: T) => void): void
}

/**
 * TODO: Documentation
 */
export type PeerEvent = 'channel' | 'error'

/**
 * TODO: Documentation
 */
export type ErrorListener = Listener<SignalError>

/**
 * TODO: Documentation
 */
export type ChannelListener = Listener<Channel>

/**
 * TODO: Documentation
 */
export type PeerListener
  = ErrorListener
  | ChannelListener

/**
 * TODO: Documentation
 */
export type OnError = (this: PeerInstance, ev: 'error', fn: ErrorListener) => void

/**
 * TODO: Documentation
 */
export type OnChannel = (this: PeerInstance, ev: 'channel', fn: ChannelListener) => void

/**
 * TODO: Documentation
 */
export type OnPeer
  = OnError
  | OnChannel

/**
 * TODO: Documentation
 */
export type RemoveErrorListener = (this: PeerInstance, ev: 'error', fn: ErrorListener) => void

/**
 * TODO: Documentation
 */
export type RemoveChannelListener = (this: PeerInstance, ev: 'channel', fn: ChannelListener) => void

/**
 * TODO: Documentation
 */
export type RemoveListener
  = RemoveErrorListener
  | RemoveChannelListener

/**
 * TODO: Documentation
 */
export type Socket = SocketIOClient.Socket

/**
 * TODO: Documentation
 */
export type Listener<T> = (payload: T) => void

/**
 * TODO: Documentation
 */
export type MessageMap = Record<string, Message>

/**
 * TODO: Documentation
 */
export type ListenerMap<KeyType extends string = string> = Record<KeyType, Listener<any>[]>

/**
 * TODO: Documentation
 */
export type Reject = (err: SignalError) => void
