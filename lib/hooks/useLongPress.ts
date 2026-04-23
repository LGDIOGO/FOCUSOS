import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react'
import { useCallback, useRef } from 'react'

type LongPressEvent = ReactMouseEvent<HTMLElement> | ReactTouchEvent<HTMLElement>

export function useLongPress(
  onLongPress: () => void,
  onClick: (event: LongPressEvent) => void,
  { delay = 500 } = {}
) {
  const timerRef = useRef<NodeJS.Timeout>()
  const isLongPressActive = useRef(false)

  const start = useCallback(
    (_event: LongPressEvent) => {
      isLongPressActive.current = false
      timerRef.current = setTimeout(() => {
        onLongPress()
        isLongPressActive.current = true
      }, delay)
    },
    [onLongPress, delay]
  )

  const clear = useCallback(
    (event: LongPressEvent, shouldTriggerClick = true) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }

      const isPrimaryMouseButton = !('button' in event) || event.button === 0

      if (shouldTriggerClick && !isLongPressActive.current && isPrimaryMouseButton) {
        onClick(event)
      }

      isLongPressActive.current = false
    },
    [onClick]
  )

  return {
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: (event: ReactMouseEvent<HTMLElement>) => clear(event, false),
    onTouchStart: start,
    onTouchEnd: clear,
  }
}
