export function insertArrayItem<T>(arr: T[], item: T, afterIndex?: number): T[] {
  const result = [...arr];
  result.splice(afterIndex !== undefined ? afterIndex + 1 : result.length, 0, item);
  return result;
}

export function moveArrayItem<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
  const result = [...arr];
  const [item] = result.splice(fromIndex, 1);
  if (item === undefined) return arr;
  result.splice(toIndex, 0, item);
  return result;
}
