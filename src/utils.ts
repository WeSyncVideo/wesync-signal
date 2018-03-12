export function bind<T extends Function> (fn: T, context: any): T {
  return function (...args: any[]) {
    return fn.apply(context, args)
  } as any
}
