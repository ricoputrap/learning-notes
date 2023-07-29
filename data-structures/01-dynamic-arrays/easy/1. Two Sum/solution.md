# 1. Two Sum

## Intuition:

Create a hash map to store each number as a key and the index as the value. While traversing each number in the array, if the substraction result of `target` to the **current number** exists as a key in the hash map, the current number and the substraction result are the valid two numbers.

## Approach

1. Create a hash map
2. Traverse through each number in `nums`
   1. Substract the `target` with the number that is currently pointed
   2. Check if the subsctraction result exists as a key in the hash map
      1. If not exists, add the current number as a key in the hash map and the index as the value.
      2. If exists, return the index of current number and the value of the "subsctraction-result number" in the hash map (which is the index of that number in `nums`)

## Pseudocode

```
def twoSum(nums: number[], target: number) -> number:
  if (nums.length == 2)           // O(1)
    return [0, 1]                 // O(1)

  mapNumToIndex = {};             // O(1)

  for (num, i) in nums:           // O(n)
    remaining = target - num      // O(1)

    if (remaining in map):        // O(1)
      return [i, map[remaining]]  // O(1)

    map[num] = i                  // O(1)

  return []                       // O(1)
```

## Complexity

- **Time Complexity**

  - `O(n)`: traverse to all numbers in array `nums`
  - Result: `O(n)` because other operations only cost constant time `O(1)` so it could be ignored.

- **Space Complexity**
  - `O(1)`: for the hash map
  - Result: `O(1)`

## Code

```typescript
function twoSum(nums: number[], target: number): number[] {
  if (nums.length == 2) return [0, 1];

  const map: Record<number, number> = {};

  for (let i = 0; i < nums.length; i++) {
    const currentNum: number = nums[i];
    const remaining: number = target - currentNum;

    if (remaining in map) {
      return [i, map[remaining]];
    }

    map[currentNum] = i;
  }

  return [];
}
```
