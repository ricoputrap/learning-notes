function groupAnagrams(strs: string[]): string[][] {
  if (strs.length === 1)
    return [[strs[0]]];

  const mapAnagrams: Record<string, string[]> = {};
  for (let i = 0; i < strs.length; i++) {
    const sortedString = strs[i].split("").sort().join();

    if (mapAnagrams[sortedString])
      mapAnagrams[sortedString].push(strs[i]);
    else
      mapAnagrams[sortedString] = [strs[i]];
  }

  const result = Object.values(mapAnagrams);
  return result;
};