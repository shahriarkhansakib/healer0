import { db, privacyConsents, eq, and } from '@healer/db';

const CONSENT_TYPES = ['AI Memory', 'Research Participation', 'Data Sharing'] as const;
type ConsentType = (typeof CONSENT_TYPES)[number];

export const PrivacyService = {
  async listConsentsForUser(userId: string) {
    return db.query.privacyConsents.findMany({
      where: eq(privacyConsents.userId, userId),
    });
  },

  async upsertConsent(userId: string, consentType: ConsentType, accepted: boolean) {
    const existing = await db.query.privacyConsents.findFirst({
      where: and(
        eq(privacyConsents.userId, userId),
        eq(privacyConsents.consentType, consentType),
      ),
    });

    const now = new Date();

    if (existing) {
      const [updated] = await db
        .update(privacyConsents)
        .set({
          accepted,
          acceptedDate: accepted ? now : existing.acceptedDate,
          revokedDate: !accepted ? now : null,
        })
        .where(
          and(
            eq(privacyConsents.userId, userId),
            eq(privacyConsents.consentType, consentType),
          ),
        )
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(privacyConsents)
      .values({
        userId,
        consentType,
        accepted,
        acceptedDate: accepted ? now : null,
        revokedDate: !accepted ? now : null,
      })
      .returning();
    return created;
  },

  async getConsentByType(userId: string, consentType: ConsentType) {
    const record = await db.query.privacyConsents.findFirst({
      where: and(
        eq(privacyConsents.userId, userId),
        eq(privacyConsents.consentType, consentType),
      ),
    });
    return record ?? null;
  },

  /**
   * Provisions all three consent types for a new user with their default values.
   * Called during onboarding — ensures every user has explicit consent records.
   */
  async provisionDefaultConsents(userId: string) {
    const defaults: Array<{ consentType: ConsentType; accepted: boolean }> = [
      { consentType: 'AI Memory', accepted: true },
      { consentType: 'Research Participation', accepted: false },
      { consentType: 'Data Sharing', accepted: false },
    ];

    const records = await Promise.all(
      defaults.map((d) => PrivacyService.upsertConsent(userId, d.consentType, d.accepted)),
    );
    return records;
  },
};
