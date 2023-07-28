## Intuition

Compare the total occurences of each character in `s` and `t`. **True** if the values are **equal**.

## Approach

1. Create a **hash map** to store the total occurences of each character in `s`.
2. Loop through all characters in `s` and populate the total occurces of each character in the hash map.
3. Loop through all characters in `t`. While traversing each character:
   1. If **it exists** as a key in the hash map:
      1. Reduce the value (total number of occurrences of that character) by `1`.
      2. If the updated value is `0`, **remove that key** from the hash map.
   2. If **it doesn't exist** as a key in the hash map, **stop** the looping and return `false` to indicate that the two strings (`s` and `t`) is **not a valid anagram**.
4. If there is still a key in the hash map, it means the two strings (`s` and `t`) is **not a valid anagram**.
5. Otherwise, it is a **valid anagram**.

## Complexity

- **Time complexity**

  - `O(n)`: looping through all the characters in string `s` to populate the total occurences of each character.
  - `O(n)`: checking if a character in string `t` already exists as a key in the hash map.
  - `O(1)`: checking if a key still exists in the hash map after the looping of all characters in string `t` is finished.
  - Result: `O(n) + O(n) + O(1) = O(2n) + O(1)` -> complexity: `O(n)`

- **Space complexity**

  - _"`s` and `t` consist of ***lowercase English letters***."_ means that each hash map would have **at most 26 keys** (a, b, c, ..., z)
  - `O(26)`: store the total occurences of each characters in string `s`. Why `26`? because the string `s` probably contains all lowercase English characters.
  - Result: `O(26) = O(1)` -> complexity: `O(1)`

## Code

```typescript
function isAnagram(s: string, t: string): boolean {
  if (s.length != t.length) return false;

  // populate total occurences of each characters in string `s`
  const mapCount: Record<string, number> = {};
  for (let i = 0; i < s.length; i++) {
    if (mapCount[s[i]]) mapCount[s[i]] += 1;
    else mapCount[s[i]] = 1;
  }

  // compare the total occurences of all characters in string `s` and `t`
  let isAnagram: boolean = true;
  for (let i = 0; i < t.length; i++) {
    // character doesn't exist in `s`
    if (!mapCount[t[i]]) {
      isAnagram = false;
      break;
    }

    // reduce the total occurence
    mapCount[t[i]] -= 1;

    // remove if total occurences is 0
    if (mapCount[t[i]] == 0) delete mapCount[t[i]];
  }

  if (!isAnagram) return false;

  // check if there is still a key in the hash map
  const totalChar = Object.values(mapCount).length;
  return totalChar == 0;
}
```
