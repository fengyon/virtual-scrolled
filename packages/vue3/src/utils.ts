import { toRaw, isRef, Ref, ComponentInternalInstance } from 'vue'
export const getRaw = <T>(v: T): T extends Ref<infer V> ? V : T => (isRef(v) ? (getRaw(v.value) as any) : toRaw(v))

export const getNativeElement = (
  refInstance: HTMLElement | ComponentInternalInstance | Ref<HTMLElement>
): HTMLElement | undefined => {
  const refValue = getRaw(refInstance)
  return refValue && (refValue instanceof HTMLElement ? refValue : (refValue as any).$el)
}

export const getBoundingClientRect = (refInstance): DOMRect | undefined =>
  getNativeElement(refInstance)?.getBoundingClientRect?.()
