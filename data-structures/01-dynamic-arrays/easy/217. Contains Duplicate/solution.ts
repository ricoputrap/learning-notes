function containsDuplicate(nums: number[]): boolean {
  let isDuplicate: boolean = false;

  // create an object named uniqueItems where the key would be
  // the unique numbers in `nums` and the value will be an integer 1.
  const uniqueItems: Record<number, 1> = {};

  // iterate through each numbers in `nums`
  // on every number, check if that number
  // already exists within the `uniqueItems`
  for (let i = 0; i < nums.length; i++) {

    // if it doesn't, register that number as a new key in `uniqueItems`
    // and the value will be an integer 1
    if (!uniqueItems[nums[i]]) {
      uniqueItems[nums[i]] = 1;
    }
    else {
      isDuplicate = true;
      break;
    }
  }

  return isDuplicate;
};