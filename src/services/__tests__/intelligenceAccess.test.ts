import {
  canReadIntelligenceSubject,
  resolveIntelligenceSubjectBoundary,
} from '../intelligenceAccess';

const user = {
  id: 'user-1',
  userId: 'user-1',
  organizationId: 'org-1',
  auth_type: 'api_key' as const,
};

describe('intelligence subject boundary', () => {
  it('allows a caller to read their own subject without adding an org filter', () => {
    expect(resolveIntelligenceSubjectBoundary(user, 'user-1')).toEqual({
      subjectId: 'user-1',
      organizationId: 'org-1',
      personalSubject: true,
    });
  });

  it('requires the caller organization when reading a non-personal subject', () => {
    expect(resolveIntelligenceSubjectBoundary(user, 'team-subject')).toEqual({
      subjectId: 'team-subject',
      organizationId: 'org-1',
      personalSubject: false,
    });
  });

  it('rejects non-personal subject reads without organization context', () => {
    expect(
      resolveIntelligenceSubjectBoundary({ id: 'user-1', auth_type: 'jwt' }, 'team-subject'),
    ).toBeNull();
  });

  it('allows job reads for personal subjects', () => {
    expect(canReadIntelligenceSubject(user, 'user-1', null)).toBe(true);
  });

  it('allows job reads for organization-scoped records in the caller organization', () => {
    expect(canReadIntelligenceSubject(user, 'other-subject', 'org-1')).toBe(true);
  });

  it('rejects job reads outside the caller organization boundary', () => {
    expect(canReadIntelligenceSubject(user, 'other-subject', 'org-2')).toBe(false);
  });
});
