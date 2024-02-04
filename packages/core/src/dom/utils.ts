import { isObject } from '../shared'

export const isHtmlElement = (a: unknown): a is HTMLElement => isObject(a) && (a.nodeType === 1 || a.nodeType === 9)
