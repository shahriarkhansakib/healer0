import {
  db,
  doctorPatientMessages,
  users,
  doctorProfiles,
  doctorSettings,
  patientProfiles,
  patientRecords,
  appointments,
  counselingSessions,
  eq,
  and,
  or,
  inArray,
  desc,
  asc,
} from '@healer/db';

export interface ConversationParticipant {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  role: 'doctor' | 'patient';
  specialization?: string;
  hospitalAffiliation?: string;
  dutyStartTime?: string;
  dutyEndTime?: string;
  offDay?: string;
  isAvailableToday?: boolean;
}

export interface ConversationSummary {
  otherUser: ConversationParticipant;
  lastMessage: {
    id: string;
    text: string;
    senderId: string;
    senderRole: 'doctor' | 'patient';
    createdAt: Date;
    isRead: boolean;
  } | null;
  unreadCount: number;
}

export interface ChatMessageItem {
  id: string;
  patientUserId: string;
  doctorUserId: string;
  senderId: string;
  senderRole: 'patient' | 'doctor';
  messageText: string;
  attachmentUrl: string | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}

export const MessagesService = {
  async listConversationsForUser(currentUserId: string, currentUserRole: string): Promise<ConversationSummary[]> {
    // 1. Find all messages involving current user
    const userMessages = await db.query.doctorPatientMessages.findMany({
      where: or(
        eq(doctorPatientMessages.patientUserId, currentUserId),
        eq(doctorPatientMessages.doctorUserId, currentUserId)
      ),
      orderBy: [desc(doctorPatientMessages.createdAt)],
    });

    const otherUserIdsSet = new Set<string>();
    for (const msg of userMessages) {
      if (msg.patientUserId === currentUserId) {
        otherUserIdsSet.add(msg.doctorUserId);
      } else {
        otherUserIdsSet.add(msg.patientUserId);
      }
    }

    // 2. Also include doctors the patient has appointments with, or vice versa
    if (currentUserRole === 'doctor') {
      const doctorProf = await db.query.doctorProfiles.findFirst({
        where: or(eq(doctorProfiles.userId, currentUserId), eq(doctorProfiles.id, currentUserId)),
      });
      const docIds = [currentUserId];
      if (doctorProf) {
        if (!docIds.includes(doctorProf.id)) docIds.push(doctorProf.id);
        if (doctorProf.userId && !docIds.includes(doctorProf.userId)) docIds.push(doctorProf.userId);
      }

      const appts = await db.query.appointments.findMany({
        where: inArray(appointments.doctorId, docIds),
        columns: { patientId: true },
      });

      for (const a of appts) {
        if (!a.patientId) continue;
        const pat = await db.query.patientProfiles.findFirst({
          where: or(eq(patientProfiles.id, a.patientId), eq(patientProfiles.userId, a.patientId)),
        });
        if (pat) {
          otherUserIdsSet.add(pat.userId);
        } else {
          otherUserIdsSet.add(a.patientId);
        }
      }

      // Also include patients from booked counseling sessions
      const csList = await db.query.counselingSessions.findMany({
        where: inArray(counselingSessions.doctorId, docIds),
        columns: { patientId: true, userId: true },
      });
      for (const cs of csList) {
        const rawId = cs.userId || cs.patientId;
        if (!rawId) continue;
        const pat = await db.query.patientProfiles.findFirst({
          where: or(eq(patientProfiles.id, rawId), eq(patientProfiles.userId, rawId)),
        });
        if (pat) otherUserIdsSet.add(pat.userId);
        else otherUserIdsSet.add(rawId);
      }

      // Also include patients from assigned patient records
      const pRecs = await db.query.patientRecords.findMany({
        where: inArray(patientRecords.doctorId, docIds),
        columns: { patientId: true },
      });
      for (const pr of pRecs) {
        if (!pr.patientId) continue;
        const pat = await db.query.patientProfiles.findFirst({
          where: or(eq(patientProfiles.id, pr.patientId), eq(patientProfiles.userId, pr.patientId)),
        });
        if (pat) otherUserIdsSet.add(pat.userId);
        else otherUserIdsSet.add(pr.patientId);
      }
    } else {
      // For patients, include any doctor they booked with
      const patProf = await db.query.patientProfiles.findFirst({
        where: eq(patientProfiles.userId, currentUserId),
      });
      const patIds = [currentUserId];
      if (patProf) patIds.push(patProf.id);

      const appts = await db.query.appointments.findMany({
        where: inArray(appointments.patientId, patIds),
        columns: { doctorId: true },
      });

      for (const a of appts) {
        const doc = await db.query.doctorProfiles.findFirst({
          where: or(eq(doctorProfiles.id, a.doctorId), eq(doctorProfiles.userId, a.doctorId)),
          columns: { userId: true },
        });
        if (doc) otherUserIdsSet.add(doc.userId);
      }

      // If patient has 0 conversations yet, populate verified doctors so they can initiate
      if (otherUserIdsSet.size === 0) {
        const doctors = await db.query.doctorProfiles.findMany({
          columns: { userId: true },
          limit: 5,
        });
        for (const d of doctors) {
          otherUserIdsSet.add(d.userId);
        }
      }
    }

    const otherUserIds = Array.from(otherUserIdsSet);
    if (otherUserIds.length === 0) return [];

    // 3. Load user records & doctor profiles for participants
    const otherUsers = await db.query.users.findMany({
      where: inArray(users.id, otherUserIds),
      columns: { id: true, name: true, email: true, image: true, role: true },
    });

    const otherDocProfiles = await db.query.doctorProfiles.findMany({
      where: inArray(doctorProfiles.userId, otherUserIds),
    });
    const docProfMap = new Map(otherDocProfiles.map((p) => [p.userId, p]));

    const docProfIds = otherDocProfiles.map((p) => p.id);
    const docSettingsList = docProfIds.length > 0
      ? await db.query.doctorSettings.findMany({
          where: inArray(doctorSettings.doctorId, docProfIds),
        })
      : [];
    const docSettingsMap = new Map(docSettingsList.map((s) => [s.doctorId, s]));

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayDayName = dayNames[new Date().getDay()];

    const conversations: ConversationSummary[] = [];

    for (const u of otherUsers) {
      // Messages between current user and u
      const threadMsgs = userMessages.filter(
        (m) =>
          (m.patientUserId === currentUserId && m.doctorUserId === u.id) ||
          (m.doctorUserId === currentUserId && m.patientUserId === u.id)
      );

      const lastMsg = threadMsgs.length > 0 ? threadMsgs[0] : null;
      const unreadCount = threadMsgs.filter((m) => m.senderId === u.id && !m.isRead).length;

      const docProf = docProfMap.get(u.id);
      const docSettings = docProf ? docSettingsMap.get(docProf.id) : null;
      const offDay = docSettings?.offDay || 'Sunday';
      const isAvailableToday = docProf ? !offDay.toLowerCase().includes(todayDayName.toLowerCase()) : undefined;

      const rawName = u.name || (u.role === 'doctor' ? 'Dr. Specialist' : 'Patient');
      const formattedName = u.role === 'doctor' && !rawName.startsWith('Dr.') ? `Dr. ${rawName}` : rawName;

      conversations.push({
        otherUser: {
          userId: u.id,
          name: formattedName,
          email: u.email,
          image: u.image || null,
          role: u.role === 'doctor' ? 'doctor' : 'patient',
          specialization: docProf?.specialization || undefined,
          hospitalAffiliation: docProf?.hospitalAffiliation || undefined,
          dutyStartTime: docSettings?.dutyStartTime,
          dutyEndTime: docSettings?.dutyEndTime,
          offDay: docSettings?.offDay,
          isAvailableToday,
        },
        lastMessage: lastMsg
          ? {
              id: lastMsg.id,
              text: lastMsg.messageText,
              senderId: lastMsg.senderId,
              senderRole: lastMsg.senderRole as 'doctor' | 'patient',
              createdAt: lastMsg.createdAt,
              isRead: lastMsg.isRead,
            }
          : null,
        unreadCount,
      });
    }

    // Sort: unread first, then latest message time, then name
    conversations.sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
      const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    return conversations;
  },

  async getThreadMessages(currentUserId: string, otherUserIdOrProfileId: string, limit = 100): Promise<{
    messages: ChatMessageItem[];
    otherUser: ConversationParticipant;
  }> {
    let resolvedUserId = otherUserIdOrProfileId;
    let otherUser = await db.query.users.findFirst({
      where: eq(users.id, otherUserIdOrProfileId),
      columns: { id: true, name: true, email: true, image: true, role: true },
    });

    if (!otherUser) {
      const docProf = await db.query.doctorProfiles.findFirst({
        where: or(eq(doctorProfiles.id, otherUserIdOrProfileId), eq(doctorProfiles.userId, otherUserIdOrProfileId)),
      });
      if (docProf) {
        resolvedUserId = docProf.userId;
        otherUser = await db.query.users.findFirst({
          where: eq(users.id, resolvedUserId),
          columns: { id: true, name: true, email: true, image: true, role: true },
        });
      }
    }

    if (!otherUser) {
      const patProf = await db.query.patientProfiles.findFirst({
        where: or(eq(patientProfiles.id, otherUserIdOrProfileId), eq(patientProfiles.userId, otherUserIdOrProfileId)),
      });
      if (patProf) {
        resolvedUserId = patProf.userId;
        otherUser = await db.query.users.findFirst({
          where: eq(users.id, resolvedUserId),
          columns: { id: true, name: true, email: true, image: true, role: true },
        });
      }
    }

    if (!otherUser) throw new Error('Target user not found');

    const docProf = await db.query.doctorProfiles.findFirst({
      where: eq(doctorProfiles.userId, resolvedUserId),
    });
    const docSettings = docProf
      ? await db.query.doctorSettings.findFirst({
          where: eq(doctorSettings.doctorId, docProf.id),
        })
      : null;

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayDayName = dayNames[new Date().getDay()];
    const offDay = docSettings?.offDay || 'Sunday';
    const isAvailableToday = docProf ? !offDay.toLowerCase().includes(todayDayName.toLowerCase()) : undefined;

    const rawName = otherUser.name || (otherUser.role === 'doctor' ? 'Dr. Specialist' : 'Patient');
    const formattedName = otherUser.role === 'doctor' && !rawName.startsWith('Dr.') ? `Dr. ${rawName}` : rawName;

    const rawMessages = await db.query.doctorPatientMessages.findMany({
      where: or(
        and(
          eq(doctorPatientMessages.patientUserId, currentUserId),
          eq(doctorPatientMessages.doctorUserId, resolvedUserId)
        ),
        and(
          eq(doctorPatientMessages.doctorUserId, currentUserId),
          eq(doctorPatientMessages.patientUserId, resolvedUserId)
        )
      ),
      orderBy: [asc(doctorPatientMessages.createdAt)],
      limit,
    });

    // Mark unread messages sent by otherUser as read
    const unreadIds = rawMessages
      .filter((m) => m.senderId === resolvedUserId && !m.isRead)
      .map((m) => m.id);

    if (unreadIds.length > 0) {
      await db
        .update(doctorPatientMessages)
        .set({ isRead: true, readAt: new Date() })
        .where(inArray(doctorPatientMessages.id, unreadIds));
    }

    const messages: ChatMessageItem[] = rawMessages.map((m) => ({
      id: m.id,
      patientUserId: m.patientUserId,
      doctorUserId: m.doctorUserId,
      senderId: m.senderId,
      senderRole: m.senderRole as 'patient' | 'doctor',
      messageText: m.messageText,
      attachmentUrl: m.attachmentUrl,
      isRead: unreadIds.includes(m.id) ? true : m.isRead,
      readAt: unreadIds.includes(m.id) ? new Date() : m.readAt,
      createdAt: m.createdAt,
    }));

    return {
      messages,
      otherUser: {
        userId: otherUser.id,
        name: formattedName,
        email: otherUser.email,
        image: otherUser.image || null,
        role: otherUser.role === 'doctor' ? 'doctor' : 'patient',
        specialization: docProf?.specialization || undefined,
        hospitalAffiliation: docProf?.hospitalAffiliation || undefined,
        dutyStartTime: docSettings?.dutyStartTime,
        dutyEndTime: docSettings?.dutyEndTime,
        offDay: docSettings?.offDay,
        isAvailableToday,
      },
    };
  },

  async sendMessage(
    senderUserId: string,
    senderRole: 'patient' | 'doctor',
    targetUserId: string,
    messageText: string,
    attachmentUrl?: string
  ): Promise<ChatMessageItem> {
    if (!messageText.trim()) {
      throw new Error('Message text cannot be empty.');
    }

    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
      columns: { id: true, role: true },
    });
    if (!targetUser) throw new Error('Target user not found.');

    // Determine patient and doctor identities
    let patientUserId: string;
    let doctorUserId: string;

    if (senderRole === 'doctor') {
      doctorUserId = senderUserId;
      patientUserId = targetUserId;
    } else {
      patientUserId = senderUserId;
      doctorUserId = targetUserId;
    }

    const [created] = await db
      .insert(doctorPatientMessages)
      .values({
        patientUserId,
        doctorUserId,
        senderId: senderUserId,
        senderRole,
        messageText: messageText.trim(),
        attachmentUrl: attachmentUrl || null,
        isRead: false,
      })
      .returning();

    return {
      id: created.id,
      patientUserId: created.patientUserId,
      doctorUserId: created.doctorUserId,
      senderId: created.senderId,
      senderRole: created.senderRole as 'patient' | 'doctor',
      messageText: created.messageText,
      attachmentUrl: created.attachmentUrl,
      isRead: created.isRead,
      readAt: created.readAt,
      createdAt: created.createdAt,
    };
  },

  async getUnreadCount(userId: string): Promise<number> {
    const unread = await db.query.doctorPatientMessages.findMany({
      where: and(
        or(
          eq(doctorPatientMessages.patientUserId, userId),
          eq(doctorPatientMessages.doctorUserId, userId)
        ),
        eq(doctorPatientMessages.isRead, false)
      ),
      columns: { senderId: true },
    });

    return unread.filter((m) => m.senderId !== userId).length;
  },
};
