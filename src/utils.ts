import * as R from 'ramda'

import { SignalError, ErrorType, Message, ChannelError } from './types/shared'
import { Participants } from './types/server'

/**
 * More performant version of bind (missing features)
 *
 * @param fn Function to bind context
 * @param context Context for 'this'
 */
export function bind<T extends Function> (fn: T, context: any): T {
  return function (...args: any[]) {
    return fn.apply(context, args)
  } as any
}

export function createMessage (event: string, payload: any): Message {
  return { event, payload }
}

/**
 * Validates the message param
 *
 * @param message The message to be sent
 *
 * @return {false} if valid message
 * @return {SignalError} If invalid message
 */
export function validateMessage (message: Message): SignalError | false {
  const errType = 'invalid_message'
  const { event } = message

  if (!event) {
    return createError(errType, 'missing event property on message signature')
  }

  if (typeof event !== 'string') {
    return createError(errType, 'event is not a string')
  }

  return false
}

export const removeFirstBy = R.curry(function<T> (by: R.Predicate<T>, list: T[]) {
  return R.remove(
    R.findIndex(by)(list),
    1,
  )(list)
})

export const omitFirstBy = R.curry<any>(function<T> (by: R.Predicate<T>, obj: Record<string, T>) {
  return R.pipe(
    R.findIndex(by),
    v => [v],
    // TODO: Fix type safety
    (R.omit as any)((R.__), obj)
  )
})

export function createSignalError (type: ErrorType, message?: string) {
  return {
    type,
    ...message && { message },
  }
}

export function createChannelError (channelId: string, type: ErrorType, message?: string) {
  return {
    channelId,
    ...createSignalError(type, message),
  }
}

export function getOtherUuid (uuid: string, participants: Participants) {
  return participants[0] === uuid ? participants[1] : participants[0]
}

export function debug (msg: string) {
  process.env.WESYNC_DEBUG && console.log(msg)
}
