# 347. Top K Frequent Elements

_Level: **Medium**_

## Intuition:

Using a hash map to store the **total occurrences** (_frequency_) of each numbers and get the top `k` numbers which has the biggest total occurrences.

## Approach:

1. Guard: if there is only 1 number in the array, return that number.
2. Create a hash map to store each numbers as the key and the total occurences of each number as the value.
3. Traverse to each number in the array.
4. Populate the total occurences of each number to the hash map.
5. Convert the hash map into array of array two elements:
   - 1st element: key (the number)
   - 2nd element: value (the total occurrences of the number in the aray)
6. Sort the array in DESC order by the 2nd element.
7. Get the 1st element of the first `k` items in the sorted array to be returned as the end result.

## Pseudocode

```
if (nums.length === 1)      // O(1)
  return nums               // O(1)

mapCount = {}               // O(1)

for num in nums:            // O(n)
    if (num in mapCount):
        mapCount[num] += 1
    else:
        mapCount[num] = 1

arrayNumToFrequency = mapCount.toArrayNumToFrequency()  // O(n)
arrayNumToFrequency = arrayNumToFrequency.sortByFreq()  // O(n log n)

result = []
for (i in range(0, k)):                                 // O(k)
    result.push(arrayNumToFrequency[i].getNum())

return result
```

## Complexity

- **Time Complexity**

  - `O(n)`: traversing through all numbers in `nums`.
  - `O(n)`: convert the hash map into array.
  - `O(n log n)`: sort the array in DESC order by the frequency (total occurences) of each unique numbers in the array.
  - `O(k)`: get the top `k` frequent number. Actually, `k` would be relatively small compared to `n`. So, it could be ignored and approximated to constant `O(1)`.
  - Result: `O(n) + O(n) + O(n log n) + O(k) = O(2n) + O(n log n) + O(1)` -> complexity: `O(n) + O(n log n)`

- **Space Complexity**
  - `O(n)`: for the hash map
  - `O(k)`: for the array `result` to store the top `k` frequent numbers
  - Result: `O(n) + O(k) = O(n + k)`

## Code

```typescript
function topKFrequent(nums: number[], k: number): number[] {
  if (nums.length === 1) return nums;

  const mapCount: Record<number, number> = {};

  nums.forEach((num) => {
    if (num in mapCount) mapCount[num] += 1;
    else mapCount[num] = 1;
  });

  let arrayNumToFrequency = Object.entries(mapCount);

  // sort the array in DESC order by the frequency
  arrayNumToFrequency = arrayNumToFrequency.sort((itemA, itemB) => {
    if (itemA[1] > itemB[1]) return -1;
    return 1;
  });

  const result: number[] = [];
  for (let i = 0; i < k; i++) {
    result.push(parseInt(arrayNumToFrequency[i][0]));
  }

  return result;
}
```
