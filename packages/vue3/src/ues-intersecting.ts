import { ComputedRef, computed, getCurrentInstance } from 'vue'
import { RefHtmlElement } from './types'
import { useIntersectionObserver } from './use-intersection-observer'

export const useIntersecting = (
  refElement: RefHtmlElement = getCurrentInstance(),
  options?: IntersectionObserverInit
): ComputedRef<boolean> => {
  const [entries] = useIntersectionObserver([refElement], options)
  return computed(() => entries.value[0]?.isIntersecting)
}
