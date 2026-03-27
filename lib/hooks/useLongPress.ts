import { useCallback, useRef, useState } from 'react'

export function useLongPress(
  onLongPress: () => void,
  onClick: () => void,
  { delay = 500 } = {}
) {
  const timerRef = useRef<NodeJS.Timeout>()
  const isLongPressActive = useRef(false)

  const start = useCallback(
    (event: any) => {
      isLongPressActive.current = false
      timerRef.current = setTimeout(() => {
        onLongPress()
        isLongPressActive.current = true
      }, delay)
    },
    [onLongPress, delay]
  )

  const clear = useCallback(
    (event: any, shouldTriggerClick = true) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      
      if (shouldTriggerClick && !isLongPressActive.current) {
        onClick()
      }
      
      isLongPressActive.current = false
    },
    [onClick]
  )

  return {
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: (e: any) => clear(e, false),
    onTouchStart: start,
    onTouchEnd: clear,
  }
}
