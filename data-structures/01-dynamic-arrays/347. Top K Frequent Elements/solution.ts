function topKFrequent(nums: number[], k: number): number[] {
  if (nums.length === 1) return nums;

  const mapCount: Record<number, number> = {};

  nums.forEach((num) => {
    if (num in mapCount) mapCount[num] += 1;
    else mapCount[num] = 1;
  });

  let arrayNumToFrequency = Object.entries(mapCount);

  // sort the array in DESC order by the frequency 
  arrayNumToFrequency = arrayNumToFrequency.sort(
    (itemA, itemB) => {
      if (itemA[1] > itemB[1])
        return - 1;
      return 1;
    }
  );

  const result: number[] = [];
  for (let i = 0; i < k; i++) {
    result.push(parseInt(arrayNumToFrequency[i][0]));
  }

  return result;
};