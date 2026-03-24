import { describe, it, expect } from 'vitest';
import { 
  djb2Hash, 
  serializeSnapshot, 
  deserializeSnapshot, 
  isValidSnapshot 
} from '../../src/infrastructure/snapshot.js';
import { 
  SnapshotVersionError, 
  SnapshotCorruptionError 
} from '../../src/types/infrastructure.js';

describe('snapshot', () => {
  describe('djb2Hash', () => {
    it('returns 8-character hex string', () => {
      const hash = djb2Hash('test');
      expect(hash).toMatch(/^[0-9a-f]{8}$/);
    });

    it('same input always produces same output (deterministic)', () => {
      expect(djb2Hash('hello')).toBe(djb2Hash('hello'));
    });

    it('different inputs produce different outputs', () => {
      expect(djb2Hash('hello')).not.toBe(djb2Hash('world'));
    });

    it('empty string produces a valid hash (no crash)', () => {
      expect(djb2Hash('')).toBe('00001505'); // 5381 in hex
    });
  });

  describe('serializeSnapshot', () => {
    it('returns a string that is valid JSON', () => {
      const result = serializeSnapshot({ foo: 'bar' });
      expect(typeof result).toBe('string');
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('envelope has correct metadata', () => {
      const result = JSON.parse(serializeSnapshot({ a: 1 }));
      expect(result.version).toBe('1.0');
      expect(result.serializedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(result.checksum).toBe(djb2Hash(result.payload));
    });

    it('round-trips correctly through deserializeSnapshot', () => {
      const data = { x: [1, 2, 3], y: { z: true } };
      const serialized = serializeSnapshot(data);
      const deserialized = deserializeSnapshot(serialized);
      expect(deserialized).toEqual(data);
    });
  });

  describe('deserializeSnapshot', () => {
    it('throws SnapshotVersionError for wrong version', () => {
      const badEnv = JSON.stringify({ version: '2.0', payload: '{}', checksum: '0' });
      expect(() => deserializeSnapshot(badEnv)).toThrow(SnapshotVersionError);
    });

    it('throws SnapshotCorruptionError when checksum mismatches', () => {
      const env = JSON.parse(serializeSnapshot({ a: 1 }));
      env.checksum = 'deadbeef';
      const tampered = JSON.stringify(env);
      expect(() => deserializeSnapshot(tampered)).toThrow(SnapshotCorruptionError);
    });

    it('throws plain Error for non-JSON input', () => {
      expect(() => deserializeSnapshot('not json')).toThrow('Invalid snapshot: not valid JSON');
    });

    it('skipChecksumValidation bypasses checksum check', () => {
      const env = JSON.parse(serializeSnapshot({ a: 1 }));
      env.checksum = 'wrong';
      const tampered = JSON.stringify(env);
      expect(deserializeSnapshot(tampered, { skipChecksumValidation: true })).toEqual({ a: 1 });
    });
  });

  describe('isValidSnapshot', () => {
    it('returns true for valid serialized snapshot', () => {
      const valid = serializeSnapshot({ test: 1 });
      expect(isValidSnapshot(valid)).toBe(true);
    });

    it('returns false for tampered data', () => {
      expect(isValidSnapshot('garbage')).toBe(false);
      
      const env = JSON.parse(serializeSnapshot({ a: 1 }));
      env.checksum = 'broken';
      expect(isValidSnapshot(JSON.stringify(env))).toBe(false);
    });
  });
});
