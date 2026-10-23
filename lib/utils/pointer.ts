/** true se o ponteiro principal é fino (mouse). No toque, não abrir teclado sozinho. */
export function isFinePointer(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches
}
