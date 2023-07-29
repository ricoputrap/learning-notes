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