/**
 * TODO: Documentation
 */
export type ErrorType
  = 'timeout'
  | 'no_such_peer'
  | 'invalid_message'
  | 'protocol_error'
  | 'no_such_channel'
  | 'server_error'
  | 'channel_already_exists'
  | 'invalid_request'

/**
 * TODO: Documentation
 */
export interface SignalError {
  type: ErrorType
  message?: string
}

export interface ChannelError extends SignalError {
  channelId: string
}

/**
 * TODO: Documentation
 */
export interface Message {
  event: string
  payload: any
}
