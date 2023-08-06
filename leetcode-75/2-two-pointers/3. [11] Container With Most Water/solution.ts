function maxArea(height: number[]): number {
  /**
  Idea:
  To make a container, the walls should be high & wide enough so that we can store as much as water in it.

  Approach:
  use two pointers that are pointing the first & last walls
  while iterating through each char:
      calculate the max water can be stored by those two wall
      if this max water is greater than the prev max, set this as the new max water

      if (the first wall is smaller than the last wall):
          do the same above thing using the first + 1 wall and last wall
      else:
          do the same above thing using the first wall and the last - 1 wall
   */

  // base case
  if (height.length === 2) {
    const maxHeight = Math.min(height[0], height[1]);
    return maxHeight * maxHeight;
  }

  let leftIndex = 0;
  let rightIndex = height.length - 1;
  let maxWater = 0;

  while (leftIndex < rightIndex) {
    const width = rightIndex - leftIndex;

    maxWater = Math.max(
      maxWater,
      width * Math.min(height[leftIndex], height[rightIndex])
    );

    if (height[leftIndex] < height[rightIndex])
      leftIndex += 1;
    else
      rightIndex -= 1;
  }

  return maxWater;
};