import {
  db,
  doctorProfiles,
  counselingSessions,
  counselingMessages,
  eq,
  desc,
  and,
} from '@healer/db';

export async function getCounselingSessionsService(userId: string) {
  const doctor = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.userId, userId),
  });
  if (!doctor) return [];

  return db.query.counselingSessions.findMany({
    where: eq(counselingSessions.doctorId, doctor.id),
    orderBy: [desc(counselingSessions.startTime)],
  });
}

export async function updateCounselingStatusService(userId: string, sessionId: string, status: string, notes?: string) {
  const doctor = await db.query.doctorProfiles.findFirst({
    where: eq(doctorProfiles.userId, userId),
  });
  if (!doctor) throw new Error('Doctor profile not found');

  const [updated] = await db.update(counselingSessions)
    .set({ 
      status,
      ...(notes && { notes }),
      ...(status === 'completed' && { endTime: new Date() }),
    })
    .where(eq(counselingSessions.id, sessionId))
    .returning();

  return updated;
}

export type CreateSessionPayload = {
  sessionType: 'Basic Counseling' | 'Deep Counseling' | 'Crisis Support';
};

export type SendMessagePayload = {
  messageText: string;
  emotionDetected?: string;
};

export const CounselingService = {
  async createSession(userId: string, payload: CreateSessionPayload) {
    const [session] = await db
      .insert(counselingSessions)
      .values({
        userId,
        sessionType: payload.sessionType,
        status: 'Active',
      })
      .returning();
    return session;
  },

  async listSessionsForUser(userId: string) {
    return db.query.counselingSessions.findMany({
      where: eq(counselingSessions.userId, userId),
      orderBy: [desc(counselingSessions.startTime)],
    });
  },

  async getSessionById(id: string, userId: string) {
    const session = await db.query.counselingSessions.findFirst({
      where: and(eq(counselingSessions.id, id), eq(counselingSessions.userId, userId)),
    });
    return session ?? null;
  },

  async endSession(id: string, userId: string) {
    const existing = await db.query.counselingSessions.findFirst({
      where: and(eq(counselingSessions.id, id), eq(counselingSessions.userId, userId)),
    });
    if (!existing) return null;

    const [updated] = await db
      .update(counselingSessions)
      .set({ status: 'Completed', endTime: new Date() })
      .where(and(eq(counselingSessions.id, id), eq(counselingSessions.userId, userId)))
      .returning();
    return updated;
  },

  async sendMessage(sessionId: string, userId: string, payload: SendMessagePayload) {
    // Verify the session belongs to this user before appending a message.
    const session = await db.query.counselingSessions.findFirst({
      where: and(
        eq(counselingSessions.id, sessionId),
        eq(counselingSessions.userId, userId),
      ),
      columns: { id: true, status: true },
    });

    if (!session) return null;
    if (session.status === 'Completed') {
      throw new Error('Cannot send messages to a completed session.');
    }

    const [message] = await db
      .insert(counselingMessages)
      .values({
        sessionId,
        sender: 'User',
        messageText: payload.messageText,
        emotionDetected: payload.emotionDetected ?? null,
      })
      .returning();
    return message;
  },

  async getMessagesForSession(sessionId: string, userId: string) {
    // Verify ownership before exposing message history.
    const session = await db.query.counselingSessions.findFirst({
      where: and(
        eq(counselingSessions.id, sessionId),
        eq(counselingSessions.userId, userId),
      ),
      columns: { id: true },
    });
    if (!session) return null;

    return db.query.counselingMessages.findMany({
      where: eq(counselingMessages.sessionId, sessionId),
      orderBy: [desc(counselingMessages.createdAt)],
    });
  },
};
