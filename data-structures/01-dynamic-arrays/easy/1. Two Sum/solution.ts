function twoSum(nums: number[], target: number): number[] {
  if (nums.length == 2)
    return [0, 1];

  const map: Record<number, number> = {};

  for (let i = 0; i < nums.length; i++) {
    const currentNum: number = nums[i];
    const remaining: number = target - currentNum;

    if (remaining in map) {
      return [i, map[remaining]]
    }

    map[currentNum] = i;
  }

  return [];
};