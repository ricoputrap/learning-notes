function kidsWithCandies(candies: number[], extraCandies: number): boolean[] {
  let maxNumIndex = 0;

  // get the max num of candies among all kids
  for (let i = 1; i < candies.length; i++) {
    if (candies[i] > candies[maxNumIndex]) {
      maxNumIndex = i;
    }
  }

  return candies.map((num, i) => {
    if (i === maxNumIndex) {
      return true;
    }

    if (candies[i] + extraCandies >= candies[maxNumIndex]) {
      return true;
    }
    return false;
  })
};