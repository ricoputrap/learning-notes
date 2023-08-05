/**
 Do not return anything, modify nums in-place instead.
 */
function moveZeroes(nums: number[]): void {
  // base case
  if (nums.length === 1) return;

  let index1 = 0;
  let index2 = Number.MAX_VALUE;

  while (index1 < index2 && index1 < nums.length - 1) {
    index2 = index1 + 1;

    // move the 1st pointer until getting 0
    if (nums[index1] !== 0) {
      index1 += 1;
      index2 = index1 + 1;
      continue;
    }

    // move the 2nd pointer until it's point at non-zero value
    while (index2 < nums.length && nums[index2] === 0) {
      index2 += 1;
    }


    // stop if index2 is the last index
    if (index2 === nums.length) break;

    // swap (put zero on the last)
    nums[index1] = nums[index2];
    nums[index2] = 0;

  }
};