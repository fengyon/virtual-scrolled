import { isHtmlElement } from '@virtual-scrolled/core'
import { toRaw, isRef, Ref } from 'vue'
import { RefHtmlElement } from './types'
export const getRaw = <T>(v: T): T extends Ref<infer V> ? V : T => (isRef(v) ? (getRaw(v.value) as any) : toRaw(v))

export const getNativeElement = (refInstance: RefHtmlElement): HTMLElement | undefined => {
  const refValue = getRaw(refInstance)
  return refValue && (isHtmlElement(refValue) ? refValue : (refValue as any).$el)
}

export const getBoundingClientRect = (refInstance: RefHtmlElement): DOMRect | undefined =>
  getNativeElement(refInstance)?.getBoundingClientRect?.()
