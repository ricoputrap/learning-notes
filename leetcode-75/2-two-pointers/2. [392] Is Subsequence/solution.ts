function isSubsequence(s: string, t: string): boolean {
  /**
    If `s` is the subsequence of `t`:
    1. `s.length <= t.length`
    2. char in `s` is placed at the same order as `t`

    Idea:
    Using two pointers to get the position of the each char in `s` in string `.
    If all char exists in `t` and the position (list of index) is ordered in ASC, then `s` is the subsequence.

    s = "abc"
    t = "ahbgdc"

    Approach:
    1. Create a pointer to iterate through each char in `s`
    2. Create a temp variable to store the index of the currently pointed char of `s` in string `t`.
    3. While iterating:
      1. If the currently pointed char doesn't exist in string `t`:
        -> then `s` is not the subsequence of `t`
      2. Otherwise AND if the index of that char in the string `t` is greater than the previously stored in temp var, then this is 
        1. store the index of that char that is found in string `t` into the temp variable. 
        2. update the pointer to the next char in string `s` (if any)
  */
  if (s.length === 0) return true;
  if (t.length === 0) return false;

  let indexS = 0;
  let prevIndexT = -1;

  // for each char in `s`
  while (indexS < s.length) { // a, x
    let indexT = prevIndexT + 1;

    // for each char in `t` start from index `indexT`
    while (indexT < t.length) {

      // current char of string `s` is found in string `t`
      if (s[indexS] == t[indexT]) {
        prevIndexT = indexT;
        break;
      }
      indexT += 1;
    }

    // When `indexT` is pointing the last char in `t`,
    // that char is still not the same as current char in `s`.
    // Hence, `indexT` is added by 1 and becomes the same value as the length of `t`
    // It means the current char in `s` doesn't exist in `t`.
    if (indexT >= t.length)
      return false;

    indexS += 1;
  }

  return prevIndexT < t.length;
};