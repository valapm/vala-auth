export function uint8ArrayToHex(array: Uint8Array) {
  return Array.from(array)
    .map(b => ("00" + b.toString(16)).slice(-2))
    .join("")
}
