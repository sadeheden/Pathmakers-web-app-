export function cleanId(id) {
  if (!id) return null;
  const onlyHex = id.match(/[a-f\d]{24}/i);
  return onlyHex ? onlyHex[0] : null;
}
