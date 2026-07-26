import * as z from 'zod';

const verifiedSSOClaimsSchema = z.object({
  sub: z.string().min(1),
  email: z.string(),
  role: z.string().min(1),
  plan: z.string().min(1).optional(),
  organization_id: z.string().min(1).optional(),
  org_id: z.string().min(1).optional(),
});

export type VerifiedSSOIdentityResult =
  | {
      ok: true;
      identity: {
        id: string;
        email: string;
        role: string;
        plan: string;
        organizationId?: string;
      };
    }
  | {
      ok: false;
      code: 'INVALID_SSO_CLAIMS' | 'SSO_IDENTITY_MISMATCH';
    };

export function resolveVerifiedSSOIdentity(
  tokenData: Record<string, unknown>,
  cookieUserId: string,
): VerifiedSSOIdentityResult {
  const parsed = verifiedSSOClaimsSchema.safeParse(tokenData);
  if (!parsed.success) {
    return { ok: false, code: 'INVALID_SSO_CLAIMS' };
  }

  if (parsed.data.sub !== cookieUserId) {
    return { ok: false, code: 'SSO_IDENTITY_MISMATCH' };
  }

  const organizationId = parsed.data.organization_id ?? parsed.data.org_id;
  return {
    ok: true,
    identity: {
      id: parsed.data.sub,
      email: parsed.data.email,
      role: parsed.data.role,
      plan: parsed.data.plan ?? 'free',
      ...(organizationId ? { organizationId } : {}),
    },
  };
}
