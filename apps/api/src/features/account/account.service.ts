import {
  db,
  users,
  userProfiles,
  userPreferences,
  eq,
} from '@healer/db';

export type UpdateProfilePayload = {
  fullName?: string;
  phone?: string;
  dateOfBirth?: string; // ISO date string
  gender?: string;
  occupation?: string;
  country?: string;
  language?: string;
  profileImage?: string;
};

export type UpdatePreferencesPayload = {
  aiMemoryEnabled?: boolean;
  moodTrackingEnabled?: boolean;
  anonymousMode?: boolean;
  notificationEnabled?: boolean;
};

export const AccountService = {
  async getProfile(userId: string) {
    const [user, profile] = await Promise.all([
      db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { id: true, name: true, email: true, phone: true, role: true, status: true, image: true },
      }),
      db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, userId),
      }),
    ]);

    return {
      user,
      profile: profile ?? null,
    };
  },

  async updateProfile(userId: string, payload: UpdateProfilePayload) {
    // 1. Update phone or name on core user record if supplied
    if (payload.phone !== undefined || payload.fullName !== undefined) {
      await db
        .update(users)
        .set({
          ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
          ...(payload.fullName !== undefined ? { name: payload.fullName } : {}),
        })
        .where(eq(users.id, userId));
    }

    // 2. Upsert user_profiles demographic row
    const existing = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
    });

    const parsedDob = payload.dateOfBirth ? new Date(payload.dateOfBirth) : undefined;

    if (existing) {
      const [updated] = await db
        .update(userProfiles)
        .set({
          ...(payload.fullName !== undefined ? { fullName: payload.fullName } : {}),
          ...(payload.dateOfBirth !== undefined ? { dateOfBirth: parsedDob } : {}),
          ...(payload.gender !== undefined ? { gender: payload.gender } : {}),
          ...(payload.occupation !== undefined ? { occupation: payload.occupation } : {}),
          ...(payload.country !== undefined ? { country: payload.country } : {}),
          ...(payload.language !== undefined ? { language: payload.language } : {}),
          ...(payload.profileImage !== undefined ? { profileImage: payload.profileImage } : {}),
        })
        .where(eq(userProfiles.userId, userId))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(userProfiles)
      .values({
        userId,
        fullName: payload.fullName ?? null,
        dateOfBirth: parsedDob ?? null,
        gender: payload.gender ?? null,
        occupation: payload.occupation ?? null,
        country: payload.country ?? null,
        language: payload.language ?? 'en',
        profileImage: payload.profileImage ?? null,
      })
      .returning();

    return created;
  },

  async getPreferences(userId: string) {
    const prefs = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    });

    if (prefs) return prefs;

    // Create default preferences if not yet existing
    const [created] = await db
      .insert(userPreferences)
      .values({
        userId,
        aiMemoryEnabled: true,
        moodTrackingEnabled: true,
        anonymousMode: false,
        notificationEnabled: true,
      })
      .returning();

    return created;
  },

  async updatePreferences(userId: string, payload: UpdatePreferencesPayload) {
    const existing = await db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    });

    if (existing) {
      const [updated] = await db
        .update(userPreferences)
        .set({
          ...(payload.aiMemoryEnabled !== undefined ? { aiMemoryEnabled: payload.aiMemoryEnabled } : {}),
          ...(payload.moodTrackingEnabled !== undefined ? { moodTrackingEnabled: payload.moodTrackingEnabled } : {}),
          ...(payload.anonymousMode !== undefined ? { anonymousMode: payload.anonymousMode } : {}),
          ...(payload.notificationEnabled !== undefined ? { notificationEnabled: payload.notificationEnabled } : {}),
        })
        .where(eq(userPreferences.userId, userId))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(userPreferences)
      .values({
        userId,
        aiMemoryEnabled: payload.aiMemoryEnabled ?? true,
        moodTrackingEnabled: payload.moodTrackingEnabled ?? true,
        anonymousMode: payload.anonymousMode ?? false,
        notificationEnabled: payload.notificationEnabled ?? true,
      })
      .returning();

    return created;
  },
};
