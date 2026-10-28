export function formatDisplayName(fullName: string) {
  const words = fullName.trim().split(/\s+/);

  if (words.length <= 2) {
    return fullName;
  }

  return `${words[0]} ${words[words.length - 1]}`;
}
