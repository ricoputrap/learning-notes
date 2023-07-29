# 49. Group Anagrams

## Intuition

Sort each string and store the same sorted string in a hash map where the key is the sorted string and the value is an array of the original strings. Convert the hash map into array of grouped anagrams.

## Approach

1. Create a hash map.
2. Traverse through each string in the array `strs`.
   1. Sort the string (the order ASC/DESC doesn't matter as long as all strings are sorted in the same order).
   2. Check if the sorted string **already exists** as a key in the hash map.
      1. **NO** -> set the sorted string as a new key in the hash map and an array containing the original string as the value.
      2. **YES** -> add the original string to the value of the key (sorted string) which is an array of the anagrams.
3. Convert the values of the hash map into array (which is the result, array of grouped anagrams).

## Pseudocode

```
def groupAnagrams(strs: string[]):
  if strs.length == 1:      // O(1)
    return [[strs[0]]];     // O(1)

  mapAnagram = {};          // O(1)

  for each str in strs:     // O(n)
    sortedStr = str.sort(); // O(m log m)

    if (sortedStr in mapAnagrams):      // O(1)
      mapAnagrams[sortedStr].push(str); // O(1)
    else
      mapAnagrams[sortedStr] = [str];   // O(1)

  arrayGroupedAnagrams = mapAnagram.toArray();  // O(n)

  return arrayGroupedAnagrams;  // O(1)
```

## Complexity

- **Time Complexity**

  - `O(n)`: traverse to all strings in the array
  - `O(m log m)`: sort a **single string** with the length `m` characters. There is `n` strings in the array that will be sorted, so it will be `O(n . m log m)`. However, actually `m` (maximum **100** characters) is **relatively small** compared to `n` (max is **10.000** strings). So, `m` could be **ignored**. Thus, the time complexity to sort all strings could be **approximated** as `O(n log m)`.
  - `O(n)`: convert the hash map into array
  - Result: `O(n) + (O(n) * O(m log m) + O(n)) = O(2n) + O(n . m log m) = O(2n) + O(n log m)` -> complexity: `O(n) + O(n log m)`

- **Space Complexity**
  - `O(n)`: for the hash map
  - `O(n)`: for all sorted strings
  - `O(n)`: for the array converted from the hash map
  - Result: `O(n) + O(n) + O(n) = O(3n)` -> complexity: `O(n)`

## Code

```typescript
function groupAnagrams(strs: string[]): string[][] {
  if (strs.length === 1) return [[strs[0]]];

  const mapAnagrams: Record<string, string[]> = {};
  for (let i = 0; i < strs.length; i++) {
    const sortedString = strs[i].split("").sort().join();

    if (mapAnagrams[sortedString]) mapAnagrams[sortedString].push(strs[i]);
    else mapAnagrams[sortedString] = [strs[i]];
  }

  const result = Object.values(mapAnagrams);
  return result;
}
```
