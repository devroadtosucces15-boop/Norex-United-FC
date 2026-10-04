const fatalUtf8 = new TextDecoder('utf-8', { fatal: true });

export function utf8Prefix(value, limit) {
  if (!Number.isInteger(limit) || limit < 0) throw new Error('UTF-8 byte limit must be a non-negative integer');
  const source = Buffer.isBuffer(value) ? value : Buffer.from(value);
  if (source.length <= limit) return source.toString('utf8');
  for (let end = limit; end >= Math.max(0, limit - 3); end--) {
    try { return fatalUtf8.decode(source.subarray(0, end)); } catch {}
  }
  throw new Error('UTF-8 prefix contains invalid input');
}

export function appendUtf8Bounded(current, chunk, limit) {
  return utf8Prefix(Buffer.concat([Buffer.from(current, 'utf8'), Buffer.from(chunk)]), limit);
}
