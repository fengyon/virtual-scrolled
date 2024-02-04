import { Margin, NumberRange } from './types'

export const isOverlap = ([left1, right1]: NumberRange, [left2, right2]: NumberRange): boolean =>
  (left1 - left2) * (left1 - right2) <= 0 || (right1 - left2) * (right1 - right2) <= 0

export const isDoc = (ele: HTMLElement) => ele && ele.nodeType === 9

export const getRect = (element: HTMLElement): DOMRect => {
  if (element && !isDoc(element)) {
    return element.getBoundingClientRect()
  } else if (element) {
    const html = document.documentElement
    const body = document.body
    return {
      top: 0,
      left: 0,
      x: 0,
      y: 0,
      right: html.clientWidth || body.clientWidth,
      width: html.clientWidth || body.clientWidth,
      bottom: html.clientHeight || body.clientHeight,
      height: html.clientHeight || body.clientHeight,
    } as DOMRect
  }
}

const parseRootMargin = (rootMargin?: string, rootRect?: DOMRect): Margin => {
  const marginString = rootMargin || '0px'
  const margins = marginString.split(/\s+/).map(function (margin) {
    const parts = /^(-?\d*\.?\d+)(px|%)$/.exec(margin)
    if (!parts) {
      throw new Error('rootMargin must be specified in pixels or percent')
    }
    return { value: parseFloat(parts[1]), unit: parts[2] as '%' | 'px' }
  })

  // Handles shorthand.
  margins[1] = margins[1] || margins[0]
  margins[2] = margins[2] || margins[0]
  margins[3] = margins[3] || margins[1]

  const [top, right, bottom, left] = margins.map(function (margin, i) {
    return margin.unit == 'px' ? margin.value : (margin.value * (i % 2 ? rootRect.width : rootRect.height)) / 100
  })
  return { top, right, bottom, left }
}

const getIntersectRange = (intersectEle?: HTMLElement, rootMargin?: string): Margin => {
  const rect = getRect(intersectEle || document.documentElement)
  const margin = parseRootMargin(rootMargin, rect)
  return {
    top: rect.top - margin.top,
    right: rect.right + margin.right,
    bottom: rect.bottom + margin.bottom,
    left: rect.left - margin.left,
  }
}

export const isIntersect = (element: HTMLElement, options?: Omit<IntersectionObserverInit, 'thresold'>): boolean => {
  if (!element?.getBoundingClientRect) {
    return false
  }
  const { root, rootMargin } = options || {}
  const { top, bottom, left, right } = element.getBoundingClientRect()
  const intersectRange = getIntersectRange(root as HTMLElement, rootMargin)

  return (
    isOverlap([top, bottom], [intersectRange.top, intersectRange.bottom]) &&
    isOverlap([left, right], [intersectRange.left, intersectRange.right])
  )
}

export const isEqualRoughly = (a: number, b: number, offset = 5) => Math.abs(a - b) < offset
