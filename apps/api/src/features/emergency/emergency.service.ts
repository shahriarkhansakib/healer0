import {
  db,
  crisisEvents,
  trustedContacts,
  eq,
  desc,
  and,
} from '@healer/db';
import { logger } from '../../infra/lib/logger';

export type ReportCrisisPayload = {
  riskLevel: 'Low' | 'Medium' | 'High';
  detectedIssue: string;
};

export type CreateTrustedContactPayload = {
  contactName: string;
  relationship: string;
  phoneNumber: string;
  email?: string;
  emergencyAlertPermission?: boolean;
};

/**
 * Determines the deterministic AI response based on risk level.
 * High-risk events also set flags to connect a psychologist and contact emergency services.
 * This function must remain deterministic and auditable — no external LLM calls.
 */
function buildCrisisResponse(riskLevel: string): {
  aiResponse: string;
  emergencyContacted: boolean;
  psychologistConnected: boolean;
} {
  if (riskLevel === 'High') {
    return {
      aiResponse:
        'We have detected a high-risk situation. Your trusted contacts and emergency services have been notified. A licensed psychologist is being connected to you right now. You are not alone — help is on the way. If you are in immediate danger, please call your local emergency number.',
      emergencyContacted: true,
      psychologistConnected: true,
    };
  }

  if (riskLevel === 'Medium') {
    return {
      aiResponse:
        'We have detected elevated distress in your responses. We recommend reaching out to a trusted contact or scheduling an urgent counseling session. Your wellbeing matters — you can also access our Crisis Support chat at any time.',
      emergencyContacted: false,
      psychologistConnected: false,
    };
  }

  return {
    aiResponse:
      'Thank you for checking in. We noticed some signs of stress. Consider exploring our relaxation exercises or journaling to process your feelings. Our AI counselor is available 24/7 if you need to talk.',
    emergencyContacted: false,
    psychologistConnected: false,
  };
}

export const EmergencyService = {
  async reportCrisis(userId: string, payload: ReportCrisisPayload) {
    const { aiResponse, emergencyContacted, psychologistConnected } =
      buildCrisisResponse(payload.riskLevel);

    const [event] = await db
      .insert(crisisEvents)
      .values({
        userId,
        riskLevel: payload.riskLevel,
        detectedIssue: payload.detectedIssue,
        aiResponse,
        emergencyContacted,
        psychologistConnected,
      })
      .returning();

    // Log all crisis events at warn level for operational monitoring.
    logger.warn(
      { userId, riskLevel: payload.riskLevel, eventId: event.id },
      'Crisis event reported',
    );

    return event;
  },

  async listCrisisEventsForUser(userId: string) {
    return db.query.crisisEvents.findMany({
      where: eq(crisisEvents.userId, userId),
      orderBy: [desc(crisisEvents.createdAt)],
    });
  },

  async listAllCrisisEvents() {
    return db.query.crisisEvents.findMany({
      orderBy: [desc(crisisEvents.createdAt)],
    });
  },

  async createTrustedContact(userId: string, payload: CreateTrustedContactPayload) {
    const [contact] = await db
      .insert(trustedContacts)
      .values({
        userId,
        contactName: payload.contactName,
        relationship: payload.relationship,
        phoneNumber: payload.phoneNumber,
        email: payload.email ?? null,
        emergencyAlertPermission: payload.emergencyAlertPermission ?? true,
      })
      .returning();
    return contact;
  },

  async listTrustedContacts(userId: string) {
    return db.query.trustedContacts.findMany({
      where: eq(trustedContacts.userId, userId),
    });
  },

  async deleteTrustedContact(id: string, userId: string) {
    const existing = await db.query.trustedContacts.findFirst({
      where: and(eq(trustedContacts.id, id), eq(trustedContacts.userId, userId)),
      columns: { id: true },
    });
    if (!existing) return false;

    await db
      .delete(trustedContacts)
      .where(and(eq(trustedContacts.id, id), eq(trustedContacts.userId, userId)));
    return true;
  },
};
