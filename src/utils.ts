import { SignalError, ErrorType, Message } from './types/shared'
import * as R from 'ramda'

export function bind<T extends Function> (fn: T, context: any): T {
  return function (...args: any[]) {
    return fn.apply(context, args)
  } as any
}

export function createError (type: ErrorType, message?: string): SignalError {
  return {
    type,
    ...message && { message },
  }
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
