import { describe, expect, it } from 'vitest';
import { resolveVerifiedSSOIdentity } from '../ssoIdentity';

describe('resolveVerifiedSSOIdentity', () => {
  it('uses identity fields from verified token claims', () => {
    expect(resolveVerifiedSSOIdentity({
      sub: 'user-1',
      email: 'verified@example.com',
      role: 'admin',
      plan: 'enterprise',
      organization_id: 'org-1',
    }, 'user-1')).toEqual({
      ok: true,
      identity: {
        id: 'user-1',
        email: 'verified@example.com',
        role: 'admin',
        plan: 'enterprise',
        organizationId: 'org-1',
      },
    });
  });

  it('rejects a cookie identity that differs from the verified subject', () => {
    expect(resolveVerifiedSSOIdentity({
      sub: 'user-1',
      email: 'verified@example.com',
      role: 'member',
    }, 'forged-user')).toEqual({
      ok: false,
      code: 'SSO_IDENTITY_MISMATCH',
    });
  });

  it('rejects verified tokens without required identity claims', () => {
    expect(resolveVerifiedSSOIdentity({
      sub: 'user-1',
    }, 'user-1')).toEqual({
      ok: false,
      code: 'INVALID_SSO_CLAIMS',
    });
  });
});
