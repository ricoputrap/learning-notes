function mergeAlternately(word1: string, word2: string): string {
  let result: string = "";
  const maxLength: number = Math.max(word1.length, word2.length);
  let index: number = 0;

  while (index < maxLength) {
    if (word1.length > index) result += word1[index];
    if (word2.length > index) result += word2[index];

    index += 1;
  }

  return result;
};