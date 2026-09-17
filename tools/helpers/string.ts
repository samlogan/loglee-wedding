export const toPlural = ({
  number,
  string,
  showNumber = true
}: {
  number: number;
  string: string;
  showNumber?: boolean;
}): string | null => {
  if (!string || !number) {
    return null;
  }
  const plural = number > 1 ? `${string}s` : string;
  return showNumber ? `${number} ${plural}` : plural;
};

export const toSnakeCase = (str: string): string => str.toLowerCase().split(' ').join('_');

export const toCapitalise = (str: string): string => {
  if (!str) {
    return '';
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const toCamelCase = (str: string): string =>
  str.toLowerCase().replaceAll(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());

export const toTitleCase = (str: string): string =>
  str.toLowerCase().replaceAll(/(?:^|\s|-)\S/g, (x) => x.toUpperCase());

export const toKebabCase = (str: string): string => str.toLowerCase().split(' ').join('-');

export const toPascalCase = (str: string): string => {
  if (!str) {
    return '';
  }
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
};

export const toSentenceCase = (str: string): string => {
  if (!str) {
    return '';
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const toDotCase = (str: string): string => str.toLowerCase().split(' ').join('.');

export const toSlug = (str: string): string =>
  str
    ?.trim()
    ?.toLowerCase()
    ?.replaceAll(/[^a-z0-9-]+/g, '-') // Replace characters not in the set [a-z0-9-] with a single hyphen
    ?.replaceAll(/-+/g, '-');
