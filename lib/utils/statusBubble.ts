import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react'

export interface BubblePosition {
  x: number
  y: number
}

type BubbleTriggerEvent =
  | ReactMouseEvent<HTMLElement>
  | ReactTouchEvent<HTMLElement>
  | MouseEvent
  | TouchEvent

const BUBBLE_IGNORE_SELECTOR = [
  '[data-bubble-ignore="true"]',
  'button',
  'a',
  'input',
  'textarea',
  'select',
  'option',
  'label',
  '[role="button"]'
].join(', ')

function isElement(target: EventTarget | null): target is Element {
  return !!target && typeof (target as Element).closest === 'function'
}

function getElementCenter(element: Element | null | undefined): BubblePosition | null {
  if (!element || typeof element.getBoundingClientRect !== 'function') {
    return null
  }

  const rect = element.getBoundingClientRect()
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  }
}

function getTouchPoint(event: BubbleTriggerEvent) {
  const nativeEvent = 'nativeEvent' in event ? event.nativeEvent : event
  if (!('changedTouches' in nativeEvent)) {
    return null
  }

  return nativeEvent.changedTouches?.[0] || nativeEvent.touches?.[0] || null
}

export function isBubbleIgnoredTarget(target: EventTarget | null) {
  return isElement(target) ? Boolean(target.closest(BUBBLE_IGNORE_SELECTOR)) : false
}

export function resolveBubblePosition(event: BubbleTriggerEvent, fallbackElement?: Element | null): BubblePosition {
  const touchPoint = getTouchPoint(event)
  if (touchPoint) {
    return { x: touchPoint.clientX, y: touchPoint.clientY }
  }

  const clientX = 'clientX' in event ? event.clientX : 0
  const clientY = 'clientY' in event ? event.clientY : 0

  if (clientX > 0 || clientY > 0) {
    return { x: clientX, y: clientY }
  }

  const fallbackPosition = getElementCenter(fallbackElement)
  if (fallbackPosition) {
    return fallbackPosition
  }

  if (typeof window !== 'undefined') {
    return {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2
    }
  }

  return { x: 0, y: 0 }
}
