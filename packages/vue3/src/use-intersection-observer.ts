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
} from 'vue'
import { isHtmlElement } from '@virtual-scrolled/core'
import { InterUtils, RefHtmlElement, Refable } from './types'
import { getNativeElement, getRaw } from './utils'

const getDiffArray = (newValue: Array<any>, oldValue: Array<any>) => {
  const newSet = new Set(newValue)
  const oldSet = new Set(oldValue)
  return [[...newSet].filter((item) => !oldSet.has(item)), [...oldSet].filter((item) => !newSet.has(item))]
}

export const useIntersectionObserver = (
  refs: Refable<Array<RefHtmlElement>>,
  options?: IntersectionObserverInit
): [Ref<Array<IntersectionObserverEntry>>, InterUtils] => {
  let isPause = false

  const entriesMap = shallowReactive(new WeakMap())

  const elementArr = computed(() => getRaw(refs).map(getNativeElement).filter(isHtmlElement))
  let addedElements = []

  const entriesArr: Ref<IntersectionObserverEntry[]> = shallowRef([])
  const fullEntries: ComputedRef<Array<IntersectionObserverEntry | null>> = computed(() =>
    elementArr.value.map((item) => entriesMap.get(item) ?? null)
  )

  const onTakeRecords = (entries: IntersectionObserverEntry[]) => {
    entries.forEach((item) => entriesMap.set(item.target, item))
    entriesArr.value = entries
  }

  const observer = new IntersectionObserver(onTakeRecords, options)

  const scope = effectScope()
  const flushFullEntries = () => {
    const records = observer.takeRecords()
    records.forEach((item) => entriesMap.set(item.target, item))
  }

  const startObserve = () => {
    isPause = false
    addedElements = elementArr.value
    elementArr.value.forEach((item) => observer.observe(item))
  }

  const pauseObserve = () => {
    isPause = true
    addedElements = []
    elementArr.value.forEach((item) => observer.unobserve(item))
  }

  const stopObserve = () => {
    observer.disconnect()
    scope.stop()
  }

  onMounted(() => {
    scope.run(() => {
      watch(
        () => elementArr.value,
        (newValue) => {
          if (isPause) return
          const [addElements, removeElements] = getDiffArray(newValue, addedElements)
          addElements.forEach((element) => observer.observe(element))
          removeElements.forEach((element) => observer.unobserve(element))
          addedElements = newValue
        },
        { immediate: true } as object
      )
    })
  })

  onBeforeUnmount(stopObserve)

  return [entriesArr, { startObserve, pauseObserve, fullEntries, flushFullEntries, stopObserve }]
}
