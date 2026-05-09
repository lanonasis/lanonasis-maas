import type { AuthenticatedUser } from '@/types/express-auth';

export interface IntelligenceSubjectBoundary {
  subjectId: string;
  organizationId?: string;
  personalSubject: boolean;
}

const firstString = (...values: Array<string | undefined>): string | undefined =>
  values.find((value) => typeof value === 'string' && value.length > 0);

export function getAuthenticatedSubject(user: AuthenticatedUser | undefined): string | undefined {
  return firstString(user?.id, user?.userId, user?.sub, user?.user_id);
}

export function getAuthenticatedOrganization(user: AuthenticatedUser | undefined): string | undefined {
  return firstString(user?.organizationId, user?.organization_id);
}

export function resolveIntelligenceSubjectBoundary(
  user: AuthenticatedUser | undefined,
  requestedSubjectId: string,
): IntelligenceSubjectBoundary | null {
  const userId = getAuthenticatedSubject(user);
  if (!userId) {
    return null;
  }

  const organizationId = getAuthenticatedOrganization(user);
  const personalSubject = requestedSubjectId === userId;

  if (personalSubject) {
    return { subjectId: requestedSubjectId, organizationId, personalSubject };
  }

  if (!organizationId) {
    return null;
  }

  return {
    subjectId: requestedSubjectId,
    organizationId,
    personalSubject: false,
  };
}

export function canReadIntelligenceSubject(
  user: AuthenticatedUser | undefined,
  subjectId: string,
  recordOrganizationId?: string | null,
): boolean {
  const userId = getAuthenticatedSubject(user);
  if (!userId) {
    return false;
  }

  if (subjectId === userId) {
    return true;
  }

  const organizationId = getAuthenticatedOrganization(user);
  if (!organizationId) {
    return false;
  }

  return subjectId === organizationId || recordOrganizationId === organizationId;
}
