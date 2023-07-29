# 217. Contains Duplicate

## Intuition

Create a hash map and traverse through each number in the array to add those number as the keys in the map. While traversing, check if the number already exists as a key in the map. If so, it means the array contains duplicate.

## Approach

1. Create a hashmap.
2. Traverse through each number in the array.
   1. If the number already exists as a key in the hash map, stop the traveral and return true (it means the array contains duplicate).
   2. Otherwise, add that number as a key in the hash map.
3. Return false if the traversal is done until the last number in the array without any break.

## Complexity

- Time Complexity

  - `O(n)`: traverse to all numbers in the array
  - `O(n)`: check if a number already exists as a key in the hash map
  - `O(n)`: add a number as a new key in the hash map
  - Result: `O(n) + O(n) + O(n) = O(3n)` -> complexity: `O(n)`

- Space Complexity
  - `O(n)`: a hash map to store the unique numbers from the array while traversing it

## Code

```typescript
function containsDuplicate(nums: number[]): boolean {
  let isDuplicate: boolean = false;

  // create an object named uniqueItems where the key would be
  // the unique numbers in `nums` and the value will be an integer 1.
  const uniqueItems: Record<number, 1> = {};

  // iterate through each numbers in `nums`
  // on every number, check if that number
  // already exists within the `uniqueItems`
  for (let i = 0; i < nums.length; i++) {
    // if it doesn't, register that number as a new key in `uniqueItems`
    // and the value will be an integer 1
    if (!uniqueItems[nums[i]]) {
      uniqueItems[nums[i]] = 1;
    } else {
      isDuplicate = true;
      break;
    }
  }

  return isDuplicate;
}
```
