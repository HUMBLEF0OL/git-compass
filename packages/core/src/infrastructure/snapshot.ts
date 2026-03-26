import { SnapshotEnvelope, DeserializeOptions, SnapshotCorruptionError, SnapshotVersionError } from '../types/infrastructure.js';

/**
 * Pure function. Computes a deterministic hash of a string using the djb2 algorithm.
 * Returns an 8-character hex string.
 */
export function djb2Hash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
    hash = hash >>> 0; // keep unsigned 32-bit
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Pure function. Serializes any analytics result into a SnapshotEnvelope JSON string.
 */
export function serializeSnapshot<T>(data: T): string {
  const payload = JSON.stringify(data);
  const checksum = djb2Hash(payload);
  
  const envelope: SnapshotEnvelope = {
    version: '1.0',
    serializedAt: new Date().toISOString(),
    payload,
    checksum,
  };
  
  return JSON.stringify(envelope);
}

/**
 * Pure function. Restores a serialized snapshot.
 */
export function deserializeSnapshot<T>(raw: string, options?: DeserializeOptions): T {
  let envelope: any;
  try {
    envelope = JSON.parse(raw);
  } catch (error) {
    throw new Error('Invalid snapshot: not valid JSON');
  }

  if (envelope.version !== '1.0') {
    throw new SnapshotVersionError(envelope.version);
  }

  if (!options?.skipChecksumValidation) {
    const actual = djb2Hash(envelope.payload);
    if (actual !== envelope.checksum) {
      throw new SnapshotCorruptionError(envelope.checksum, actual);
    }
  }

  try {
    return JSON.parse(envelope.payload) as T;
  } catch (error) {
    throw new Error('Invalid snapshot: payload is not valid JSON');
  }
}

/**
 * Pure function. Returns true if raw can be successfully deserialized without error.
 */
export function isValidSnapshot(raw: string): boolean {
  try {
    deserializeSnapshot(raw);
    return true;
  } catch {
    return false;
  }
}
