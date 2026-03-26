import { useCallback, useRef, useState } from 'react'

export function useLongPress(
  onLongPress: () => void,
  onClick: () => void,
  { delay = 500, shouldPreventDefault = true } = {}
) {
  const [longPressTriggered, setLongPressTriggered] = useState(false)
  const timerRef = useRef<NodeJS.Timeout>()
  const targetRef = useRef<EventTarget>()

  const start = useCallback(
    (event: any) => {
      if (shouldPreventDefault && event.target) {
        event.target.addEventListener('touchend', preventDefault, {
          passive: false
        })
        targetRef.current = event.target
      }
      timerRef.current = setTimeout(() => {
        onLongPress()
        setLongPressTriggered(true)
      }, delay)
    },
    [onLongPress, delay, shouldPreventDefault]
  )

  const clear = useCallback(
    (event: any, shouldTriggerClick = true) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (shouldTriggerClick && !longPressTriggered) onClick()
      setLongPressTriggered(false)
      if (shouldPreventDefault && targetRef.current) {
        targetRef.current.removeEventListener('touchend', preventDefault)
      }
    },
    [onClick, longPressTriggered, shouldPreventDefault]
  )

  return {
    onMouseDown: (e: any) => start(e),
    onTouchStart: (e: any) => start(e),
    onMouseUp: (e: any) => clear(e),
    onMouseLeave: (e: any) => clear(e, false),
    onTouchEnd: (e: any) => clear(e),
  }
}

const preventDefault = (event: Event) => {
  if (!('touches' in event)) return
  if ((event as TouchEvent).touches.length < 2 && event.preventDefault) {
    event.preventDefault()
  }
}
