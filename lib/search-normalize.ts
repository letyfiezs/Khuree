const cyrillicToLatin: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "j",
  з: "z",
  и: "i",
  й: "i",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  ө: "u",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ү: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

export function normalizeSearchText(value: string) {
  return value
    .normalize("NFKD")
    .toLocaleLowerCase("mn")
    .split("")
    .map((character) => cyrillicToLatin[character] ?? character)
    .join("")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function matchesSearch(query: string, ...values: string[]) {
  const words = normalizeSearchText(query).split(" ").filter(Boolean);
  if (!words.length) return true;
  const searchable = normalizeSearchText(values.join(" "));
  const variants = (value: string) => {
    const result = new Set([value]);
    const add = (transform: (text: string) => string) => result.add(transform(value));
    add((text) => text.replace(/kh/g, "h"));
    add((text) => text.replace(/ts/g, "c").replace(/ch/g, "c"));
    add((text) => text.replace(/c/g, "ts"));
    add((text) => text.replace(/zh/g, "j").replace(/j/g, "zh"));
    add((text) => text.replace(/u/g, "o"));
    add((text) => text.replace(/o/g, "u"));
    return [...result];
  };
  const searchableVariants = variants(searchable);
  return words.every((word) => {
    return variants(word).some((candidate) =>
      searchableVariants.some((searchableValue) => searchableValue.includes(candidate)),
    );
  });
}
