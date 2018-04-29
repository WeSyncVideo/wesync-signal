type Reject = (err: SignalError) => void

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

/**
 * TODO: Documentation
 */
export interface SignalError {
  type: ErrorType
  message?: string
}

/**
 * TODO: Documentation
 */
export interface Message {
  event: string
  payload: any
}
