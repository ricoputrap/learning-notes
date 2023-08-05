# 605. Can Place Flowers

| Level | Time         | Date            |
| ----- | ------------ | --------------- |
| Easy  | > 30 minutes | Sat, 5 Aug 2023 |

## Approach

1. Traverse through each plot in the flowerbed.
2. If the current plot, prev plot, and the next plot are **empty**:
   1. Decrease the number of new flower (n) by 1 (`n = n - 1`)
   2. Set the current plot as not empty anymore.

## Complexity

| Time   | Space  |
| ------ | ------ |
| `O(n)` | `O(1)` |

- **Time Complexity**

  - `O(n)`: loop through all `n` plots in the flowerbed and do the processes for each plot at once.
    1. `O(1)`: Check if the current plot is empty.
    2. `O(1)`: Check if the prev plot is empty (if any).
    3. `O(1)`: Check if the next plot is empty (if any).
    4. `O(2)`: Update `n -= 1` and set the current plot to be not empty anymore when the three points above are true.
  - Result: `O((1 + 1 + 1 + 2) * n) = O(5n)` -> `O(n)`

- **Space Complexity**
  - `O(1)`: create a variable to store the length of the flowerbed.

## Code

```typescript
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
  if (n == 1 && sizeFlowerbed == 1) return flowerbed[0] == 0;

  if (n >= sizeFlowerbed) return false;

  let numNewPlanted = 0;
  for (let i = 0; i < sizeFlowerbed; i++) {
    if (flowerbed[i] !== 0) continue;

    // can be planted only if prev & next plot are empty
    const isPrevEmpty = i === 0 || flowerbed[i - 1] === 0;
    const isNextEmpty = i === sizeFlowerbed - 1 || flowerbed[i + 1] === 0;

    if (isPrevEmpty && isNextEmpty) {
      numNewPlanted += 1;
      flowerbed[i] = 1;
    }
  }

  return numNewPlanted >= n;
}
```

## Submission

![Submission](submission.png)
