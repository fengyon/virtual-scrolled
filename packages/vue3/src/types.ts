import { ComponentInternalInstance, ComputedRef, Ref } from 'vue'

export interface InterUtils {
  startObserve(): void
  pauseObserve(): void
  fullEntries: ComputedRef<Array<IntersectionObserverEntry | null>>
  flushFullEntries(): void
  stopObserve(): void
}

export type Refable<T> = T | Ref<T>

export type RefHtmlElement = Refable<HTMLElement | ComponentInternalInstance>
