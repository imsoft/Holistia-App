/**
 * Normaliza nombres propios (nombres y apellidos)
 * Maneja casos especiales como "MC", "De", "La", etc.
 */
export function normalizeName(name: string): string {
  if (!name || typeof name !== 'string') return '';

  const lowercased = name.toLowerCase().trim();
  const lowercaseWords = ['de', 'del', 'la', 'el', 'los', 'las', 'y', 'e', 'o', 'u'];
  const uppercasePrefixes = ['mc', 'mac', "o'", "d'", 'von', 'van', 'le', 'du'];

  return lowercased
    .split(' ')
    .map((word, index) => {
      if (!word) return word;

      if (index === 0) {
        const prefix = uppercasePrefixes.find((pref) =>
          word.toLowerCase().startsWith(pref.toLowerCase())
        );
        if (prefix) {
          const rest = word.slice(prefix.length);
          return prefix.toUpperCase() + (rest ? rest.charAt(0).toUpperCase() + rest.slice(1) : '');
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      }

      if (lowercaseWords.includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}
