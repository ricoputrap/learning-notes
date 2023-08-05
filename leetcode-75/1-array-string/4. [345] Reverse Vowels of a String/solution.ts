
function reverseVowels(s: string): string {
  if (s.length === 1) return s;

  const VOWELS = new Set(["a", "i", "u", "e", "o", "A", "I", "U", "E", "O"]);

  const reversedChars = [...s];
  let index1 = 0;
  let index2 = s.length - 1;

  while (index1 < index2) {
    if (!VOWELS.has(reversedChars[index1]))
      index1 += 1;

    if (!VOWELS.has(reversedChars[index2]))
      index2 -= 1;

    if (VOWELS.has(reversedChars[index1]) && VOWELS.has(reversedChars[index2])) {
      const char1 = reversedChars[index1];

      reversedChars[index1] = reversedChars[index2];
      reversedChars[index2] = char1;

      index1 += 1;
      index2 -= 1;
    }
  }

  return reversedChars.join("");
};