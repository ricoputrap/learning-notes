function reverseWords(s: string): string {
  const words: string[] = s.split(" ").filter((word) => {
    return word.trim() != "";
  });

  if (words.length === 1) return words[0];

  let index1 = 0;
  let index2 = words.length - 1;

  while (index1 < index2) {
    // swap
    const word1 = words[index1];
    words[index1] = words[index2];
    words[index2] = word1;

    index1 += 1;
    index2 -= 1;
  }

  return words.join(" ");
};