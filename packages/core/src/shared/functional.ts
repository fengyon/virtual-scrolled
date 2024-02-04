import { isFunction } from "./judge";
import { FunctionType } from "./types";

export const functionalize = <T>(
  target: T
): T extends FunctionType ? T : (...args: any[]) => T =>
  isFunction(target) ? target : ((() => target) as any);

export const single = <T extends () => Promise<any>>(fn: T): T => {
  let isCalling = false;
  let callingPromise: ReturnType<T>;
  return async function singled() {
    if (isCalling) {
      return callingPromise;
    }
    isCalling = true;
    try {
      callingPromise = fn.call(this);
      const result = await callingPromise;
      return result;
    } finally {
      callingPromise = undefined;
      isCalling = false;
    }
  } as T;
};
