type ClassNameProperties = string | number | Record<string, unknown> | null | undefined;

/**
 * classNames
 * Return classes from parsed arguments.
 * @param args Array of strings, numbers, objects, or null.
 * @return Return classes as a single string or null if empty.
 */
const classNames = (...args: ClassNameProperties[]): string | undefined => {
  const classes = args.reduce<string[]>((classesArray, arg) => {
    if (arg === null) {
      return classesArray;
    }

    if (typeof arg === 'string' || typeof arg === 'number') {
      classesArray.push(arg.toString());
    } else if (typeof arg === 'object') {
      Object.entries(arg).forEach(([key, value]) => {
        if (value) {
          classesArray.push(key);
        }
      });
    }

    return classesArray;
  }, []);

  return classes.length > 0 ? classes.join(' ') : undefined;
};

export default classNames;
