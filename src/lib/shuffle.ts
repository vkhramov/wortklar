/** In-place Fisher–Yates shuffle; returns the same array. */
export function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}

/** Shuffled copy — selection order stays fixed; presentation order varies. */
export function shuffled<T>(items: readonly T[]): T[] {
  return shuffleInPlace([...items]);
}
