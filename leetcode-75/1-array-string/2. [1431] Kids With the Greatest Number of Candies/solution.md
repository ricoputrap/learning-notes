# 1431. Kids With the Greatest Number of Candies

| Level | Time                  | Date            |
| ----- | --------------------- | --------------- |
| Easy  | 12 minutes 25 seconds | Sat, 5 Aug 2023 |

## Approach

1. Get the index of the biggest number of candies -> `maxNumIndex`
2. Traverse through each number in `candies` and check if the sum of the current number with `extraCandies` is **greater than or equal (gte)** to the biggest number of candies.
3. If `currentIndex === maxNumIndex`, no need to sum them because it's guaranted that the number at `currentIndex` is the biggest.

## Complexity

| Time   | Space  |
| ------ | ------ |
| `O(n)` | `O(1)` |

- **Time Complexity**

  - `O(1)`: create a variable `maxNumIndex`
  - `O(n)`: looping to `n` numbers to get the biggest value
  - `O(n)`: looping to `n` numbers to check if the current index equals to `maxNumIndex`
  - `O(n)`: looping to `n` numbers to check if the sum of the current number with `extraCandies` **gte** to the biggest num of candies.
  - Result: `O(1) + O(n) + O(n) + O(n) = O(1) + O(3n) = O(n)` -> `O(n)`

- **Space Complexity**
  - `O(1)`: create a variable to store the index of the biggest num of candies

## Code

```typescript
function kidsWithCandies(candies: number[], extraCandies: number): boolean[] {
  let maxNumIndex = 0;

  // get the max num of candies among all kids
  for (let i = 1; i < candies.length; i++) {
    if (candies[i] > candies[maxNumIndex]) {
      maxNumIndex = i;
    }
  }

  return candies.map((num, i) => {
    if (i === maxNumIndex) {
      return true;
    }

    if (candies[i] + extraCandies >= candies[maxNumIndex]) {
      return true;
    }
    return false;
  });
}
```

## Submission

![Submission](submission.png)
