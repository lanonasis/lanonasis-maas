import { describe, expect, it } from 'vitest';

import { getScalarRouteParam } from '../request';

describe('getScalarRouteParam', () => {
  it('returns scalar string parameters', () => {
    expect(getScalarRouteParam('memory-id')).toBe('memory-id');
  });

  it.each([undefined, null, ['memory-id'], 42])(
    'rejects non-scalar route parameters: %j',
    (value) => {
      expect(getScalarRouteParam(value)).toBeUndefined();
    },
  );
});
