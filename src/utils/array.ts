export function moveArrayItem<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
  const result = [...arr];
  const [item] = result.splice(fromIndex, 1);
  if (item === undefined) return arr;
  result.splice(toIndex, 0, item);
  return result;
}
