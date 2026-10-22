import { describe, expect, it } from 'vitest';
import { resolveArea } from './host';

const env = { ADMIN_HOST: 'ad2.chairops.online' };

describe('resolveArea', () => {
  it('admin host -> admin', () => {
    expect(resolveArea('ad2.chairops.online', env)).toBe('admin');
  });
  it('strips port and lowercases', () => {
    expect(resolveArea('AD2.chairops.online:443', env)).toBe('admin');
  });
  it('web host -> web', () => {
    expect(resolveArea('fit2.chairops.online', env)).toBe('web');
  });
  it('null -> web', () => {
    expect(resolveArea(null, env)).toBe('web');
  });
  it('takes the first value of a forwarded list', () => {
    expect(resolveArea('ad2.chairops.online, fit2.chairops.online', env)).toBe('admin');
  });
  it('does not match lookalike hosts', () => {
    expect(resolveArea('evil-ad2.chairops.online', env)).toBe('web');
    expect(resolveArea('ad2.chairops.online.evil.com', env)).toBe('web');
  });
  it('empty ADMIN_HOST never matches', () => {
    expect(resolveArea('', { ADMIN_HOST: '' })).toBe('web');
    expect(resolveArea(null, { ADMIN_HOST: '' })).toBe('web');
  });
});
