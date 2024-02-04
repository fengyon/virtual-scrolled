import {
  ComputedRef,
  Ref,
  WritableComputedRef,
  computed,
  effectScope,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  shallowReactive,
  watch,
} from 'vue'
import { useIntersectionObserver } from './use-intersection-observer'
import { scrollSmooth } from '@virtual-scrolled/core'
import { getNativeElement, getBoundingClientRect } from './utils'

interface Preload {
  prev: number
  next: number
}

type VirtualScrollOptions = {
  items: any[]
  scrollContainer: HTMLElement | (() => HTMLElement)
  itemMinHeight?: number | ((item: any, index: number) => number)
  itemMinWidth?: number | ((item: any, index: number) => number)
  preload?: number | Partial<Preload>
  activeIndex?: number
  stopper?: Ref<boolean>
}

interface DealedOptions {
  preload: Ref<Preload>
  itemsMap: ComputedRef<Map<number, any>>
  itemIndexMap: ComputedRef<Map<any, number>>
  getMinHeight: (item: any, index: any) => number
  getMinWidth: (item: any, index: any) => number
  scrollContainer: ComputedRef<HTMLElement>
  activeIndexs: Map<number, null | HTMLElement>
  stopper: Ref<boolean>
  activeIndex: WritableComputedRef<number>
}

const getInitActiveIndexs = (preload: Ref<Preload>, activeIndex: number) => {
  const { next, prev } = preload.value

  return shallowReactive(
    new Map<number, null>(
      new Array(next + prev)
        .fill(null)
        .map((item, index) => [index + activeIndex - prev, item])
        .filter(([i]) => i >= 0) as Array<[number, null]>
    )
  )
}

const getOptions = (inputOptions: VirtualScrollOptions): DealedOptions => {
  const options = reactive(inputOptions)
  const defaultPreload = { prev: 0, next: 0 }
  const preload: Ref<Preload> = computed(() =>
    typeof options.preload === 'number'
      ? { prev: options.preload, next: options.preload }
      : {
          ...defaultPreload,
          ...(options.preload || {}),
        }
  )

  const itemsMap = computed(() => new Map(options.items.map((item, index) => [index, item])))

  const itemIndexMap = computed(() => new Map(options.items.map((item, index) => [item, index])))

  const getMinHeight = (item, index) =>
    typeof options.itemMinHeight === 'function' ? options.itemMinHeight(item, index) : options.itemMinHeight || 0

  const getMinWidth = (item, index) =>
    typeof options.itemMinWidth === 'function' ? options.itemMinWidth(item, index) : options.itemMinWidth || 0

  const scrollContainer = computed(() =>
    typeof options.scrollContainer === 'function' ? options.scrollContainer() : options.scrollContainer
  )
  const customStopper = ref(false)
  const stopper = computed({
    set: (value) => {
      customStopper.value = value
    },
    get: () => options.stopper || customStopper.value,
  })

  const activeIndex = computed({
    set(value: number) {
      options.activeIndex = value
    },
    get() {
      return options.activeIndex ?? 0
    },
  })

  return {
    preload,
    itemsMap,
    getMinHeight,
    getMinWidth,
    scrollContainer,
    activeIndexs: getInitActiveIndexs(preload, activeIndex.value),
    stopper,
    itemIndexMap,
    activeIndex,
  }
}
const isOverlap = ([left1, right1], [left2, right2]) =>
  (left1 < left2 && right1 > left2) ||
  (left1 < right2 && right1 > right2) ||
  (left1 >= left2 && left1 <= right2) ||
  (right1 >= left2 && right1 <= right2)

const isInView = (domRect: DOMRect) => {
  if (!domRect) {
    return false
  }
  const viewHeight = window.innerHeight || document.documentElement.clientHeight
  const viewWidth = window.innerWidth || document.documentElement.clientWidth

  return (
    isOverlap([domRect.top, domRect.bottom], [0, viewHeight]) &&
    isOverlap([domRect.left, domRect.right], [0, viewWidth])
  )
}

const singleAsync = (fn) => {
  let isCalling = false
  let callingPromise
  return async function (...args) {
    if (isCalling) {
      return callingPromise
    }
    isCalling = true
    try {
      callingPromise = fn.apply(this, args)
      const result = await callingPromise
      isCalling = false
      return result
    } catch (e) {
      callingPromise = undefined
      isCalling = false
      throw e
    }
  }
}

export const useVirtualScroll = (options: VirtualScrollOptions) => {
  const { preload, itemsMap, scrollContainer, activeIndexs, stopper, activeIndex } = getOptions(options)

  const [entriesArr, { startObserve, pauseObserve }] = useIntersectionObserver(
    computed(() =>
      Array.from(activeIndexs.entries())
        .sort(([index1], [index2]) => index1 - index2)
        .map(([, value]) => value)
    )
  )

  const isActive = (index) => activeIndexs.has(index)

  const activeIndexsSorted = computed(() =>
    Array.from(activeIndexs.entries())
      .map(([index]) => index)
      .sort((index1, index2) => index1 - index2)
  )

  const preloadRange: Ref<[number, number]> = ref([
    activeIndexsSorted.value[0],
    activeIndexsSorted.value[activeIndexsSorted.value.length - 1],
  ])

  const unload = computed(() => {
    const loadItems = Array.from(activeIndexs.entries()).sort(([index1], [index2]) => index1 - index2)
    const prevIndex = (loadItems[0]?.[0] || 0) - 1
    const nextIndex = (loadItems[loadItems.length - 1]?.[0] || 0) + 1
    const value = {
      prevCount: loadItems[0]?.[0] || 0,
      nextCount: itemsMap.value.size - nextIndex - 1,
      prevIndex,
      nextIndex,
      prevItem: itemsMap.value.get(prevIndex),
      nextItem: itemsMap.value.get(nextIndex),
    }
    return value
  })

  const activeItems = computed(() =>
    Array.from(itemsMap.value.entries())
      .filter(([index]) => isActive(index))
      .map(([, value]) => value)
  )

  const setRef = (index, itemRef) => {
    if (activeIndexs.has(index)) {
      activeIndexs.set(index, itemRef)
    }
  }

  const scope = effectScope()
  const renderedActives = computed(
    () => new Map(Array.from(activeIndexs.entries()).filter(([, value]) => getNativeElement(value)))
  )
  const loadMore = singleAsync(async () => {
    await nextTick()
    itemsMap.value.forEach((item, index) => {
      if (isOverlap(preloadRange.value, [index, index])) {
        !activeIndexs.has(index) && activeIndexs.set(index, null)
      } else {
        activeIndexs.has(index) && activeIndexs.delete(index)
      }
    })
    await nextTick()
    const visibleIndexs = Array.from(activeIndexs.entries())
      .sort(([index1], [index2]) => index1 - index2)
      .filter(([, element]) => isInView(getBoundingClientRect(element)!))
      .map(([index]) => index)
    if (!visibleIndexs.length) {
      return
    }

    activeIndex.value = visibleIndexs[0]

    const { prev, next } = preload.value
    const start = visibleIndexs[0] - prev
    const end = visibleIndexs[visibleIndexs.length - 1] + next
    const [oldStart, oldEnd] = preloadRange.value

    if (start < oldStart || end > oldEnd) {
      preloadRange.value = [start, end]
    }
  })

  onMounted(() => {
    scope.run(() => {
      let preActiveTop = getBoundingClientRect(activeIndexs.get(activeIndex.value))?.top
      watch(
        renderedActives,
        (renderedActives, oldRenderedActives) => {
          const activeTop = getBoundingClientRect(activeIndexs.get(activeIndex.value))?.top
          if (stopper.value) {
            preActiveTop = activeTop
            return
          }
          let isAddPre = false
          if (typeof activeTop === 'number' && typeof preActiveTop === 'number') {
            renderedActives.forEach((item, index) => {
              if (!isAddPre && index < activeIndex.value && !oldRenderedActives.has(index)) {
                isAddPre = true
              }
            })
          }
          if (isAddPre) {
            scrollContainer.value.style.scrollBehavior = 'auto'
            scrollContainer.value.scrollTop = scrollContainer.value.scrollTop + activeTop! - preActiveTop!
            scrollContainer.value.style.scrollBehavior = ''
          }
          preActiveTop = getBoundingClientRect(activeIndexs.get(activeIndex.value))?.top
        },
        { flush: 'sync' }
      )

      watch(
        stopper,
        (value, oldValue) => {
          if (value === oldValue) {
            return
          }
          value ? pauseObserve() : startObserve()
        },
        { flush: 'sync' }
      )

      watch(
        () => [preload.value, itemsMap.value, entriesArr.value, preloadRange.value],
        () => {
          if (stopper.value) {
            return
          }
          loadMore()
        }
      )
    })
  })

  onBeforeUnmount(() => {
    scope.stop()
  })

  const scrollToActive = async (inputIndex, pos?) => {
    const activeElement = activeIndexs.get(inputIndex)
    if (activeElement) {
      await scrollSmooth(scrollContainer.value, () => {
        const { top } = getBoundingClientRect(activeElement)!
        const { scrollTop } = scrollContainer.value
        const value = scrollTop + top - (pos || 0)
        return value
      })
    }
  }

  const setActiveIndex = async (inputIndex, pos?) => {
    if (inputIndex === activeIndex.value) {
      return
    }
    stopper.value = true
    const [start, end]: [number, number] =
      activeIndex.value < inputIndex
        ? [inputIndex, inputIndex + preload.value.next]
        : [inputIndex - preload.value.prev, inputIndex]

    activeIndex.value = inputIndex

    for (let index = start; index <= end; index++) {
      !activeIndexs.has(index) && activeIndexs.set(index, null)
    }

    await nextTick()
    await scrollToActive(inputIndex, pos)
    stopper.value = false

    preloadRange.value = [inputIndex - preload.value.prev, inputIndex + preload.value.next]
  }

  return [activeItems, { setActiveIndex, setRef, unload, isActive }]
}
