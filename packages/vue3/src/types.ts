import { ComputedRef } from 'vue'

export interface InterUtils {
  startObserve(): void
  pauseObserve(): void
  fullEntries: ComputedRef<IntersectionObserverEntry[]>
  flushFullEntries(): void
}
