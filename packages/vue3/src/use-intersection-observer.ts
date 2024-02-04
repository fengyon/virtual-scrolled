import {
  ComputedRef,
  Ref,
  computed,
  effectScope,
  onBeforeUnmount,
  onMounted,
  watch,
  shallowReactive,
  shallowRef,
  ComponentInternalInstance,
} from 'vue'
import { isHtmlElement } from '@virtual-scrolled/core'
import { InterUtils } from './types'
import { getNativeElement } from './utils'

type Refable<T> = T | Ref<T>

const getDiffArray = (newValue: Array<any>, oldValue: Array<any>) => {
  const newSet = new Set(newValue)
  const oldSet = new Set(oldValue)
  return [[...newSet].filter((item) => !oldSet.has(item)), [...oldSet].filter((item) => !newSet.has(item))]
}

export const useIntersectionObserver = (
  refs: Refable<Array<Refable<HTMLElement | null | ComponentInternalInstance>>>,
  options?: IntersectionObserverInit
): [Ref<Array<IntersectionObserverEntry>>, InterUtils, IntersectionObserver] => {
  let isPause = false

  const refsArr = computed(() => (Array.isArray(refs) ? refs : refs.value) || [])
  // const elementIndexMap = computed(
  //   () =>
  //     new WeakMap<HTMLElement, number>(
  //       refsArr.value
  //         .map(getNativeElement)
  //         .map((item, index) => [item, index] as [HTMLElement, number])
  //         .filter(([item]) => isHtmlElement(item))
  //     )
  // )
  const entriesMap = shallowReactive(new WeakMap())

  const elementArr = computed(() => refsArr.value.map(getNativeElement).filter(isHtmlElement))
  const entriesArr: Ref<IntersectionObserverEntry[]> = shallowRef([])
  const fullEntries: ComputedRef<IntersectionObserverEntry[]> = computed(() =>
    elementArr.value.map((item) => entriesMap.get(item)).filter(Boolean)
  )

  const onTakeRecords = (entriesArg: IntersectionObserverEntry[]) => {
    entriesArg.forEach((item) => entriesMap.set(item.target, item))
    entriesArr.value = entriesArg
  }

  const observer = new IntersectionObserver(onTakeRecords, options)

  const scope = effectScope()

  onMounted(() => {
    scope.run(() => {
      watch(
        () => elementArr.value,
        (newValue, oldValue) => {
          if (isPause) {
            return
          }
          const [addedElements, removedElements] = getDiffArray(newValue, oldValue)
          addedElements.forEach((element) => observer.observe(element))
          removedElements.forEach((element) => observer.unobserve(element))
        },
        { immediate: true } as object
      )
    })
  })

  const flushFullEntries = () => {
    const records = observer.takeRecords()
    records.forEach((item) => entriesMap.set(item.target, item))
  }

  const startObserve = () => {
    isPause = false
    elementArr.value.forEach((item) => observer.observe(item))
  }

  const pauseObserve = () => {
    isPause = true
    elementArr.value.forEach((item) => observer.unobserve(item))
  }

  onBeforeUnmount(() => {
    observer.disconnect()
    scope.stop()
  })

  return [entriesArr, { startObserve, pauseObserve, fullEntries, flushFullEntries }, observer]
}
