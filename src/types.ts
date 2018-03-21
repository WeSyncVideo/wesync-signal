export type ErrorType
  = 'timeout'
  | 'no_such_peer'
  | 'invalid_message'
  | 'protocol_error'
  | 'no_such_channel'

export interface Error {
  type: ErrorType
  message?: string
}

export interface Message {
  event: string
  payload: any
}
