import { describe, expect, it } from 'vitest';

describe('rules_vite smoke', () => {
    it('runs vitest under Bazel', () => {
        expect(1 + 1).toBe(2);
    });

    it('handles async', async () => {
        const v = await Promise.resolve(42);
        expect(v).toBe(42);
    });
});
