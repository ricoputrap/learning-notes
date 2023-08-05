function canPlaceFlowers(flowerbed: number[], n: number): boolean {
  /**
  Approach:
  1. Traverse through the flowerbed.
  2. If the current plot, prev plot, and next plot are empty:
      - decrease the number of new flower (n) by 1 (n = n - 1)
      - set the current plot as not-empty anymore (flowerplot[i] = 1)
   */

  if (n === 0) return true;

  const sizeFlowerbed = flowerbed.length;
  if (n == 1 && sizeFlowerbed == 1)
    return flowerbed[0] == 0;

  if (n >= sizeFlowerbed) return false;

  let numNewPlanted = 0;
  for (let i = 0; i < sizeFlowerbed; i++) {
    if (flowerbed[i] !== 0)
      continue;

    // can be planted only if prev & next plot are empty
    const isPrevEmpty = (i === 0) || (flowerbed[i - 1] === 0);
    const isNextEmpty = (i === sizeFlowerbed - 1) || (flowerbed[i + 1] === 0);

    if (isPrevEmpty && isNextEmpty) {
      numNewPlanted += 1;
      flowerbed[i] = 1;
    }
  }

  return numNewPlanted >= n;
};