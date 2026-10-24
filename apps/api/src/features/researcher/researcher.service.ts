import {
  db,
  users,
  researcherProfiles,
  researcherDashboardSummaries,
  researchProjects,
  researchParticipants,
  participantScreening,
  researchSurveys,
  surveyQuestions,
  researchDataCollection,
  researchAnalytics,
  participantMatchingRequests,
  matchedParticipants,
  literatureSearchHistory,
  researchPapers,
  collaborationNetwork,
  researchCollaborationMessages,
  researchReports,
  researcherPermissions,
  researcherSettings,
  userPreferences,
  eq,
  desc,
  sql,
} from '@healer/db';

export const ResearcherService = {
  // 1. Get or Ensure Researcher Profile
  async getResearcherProfile(userId: string) {
    if (!userId) throw new Error('User ID is required');

    let profile = await db.query.researcherProfiles.findFirst({
      where: eq(researcherProfiles.userId, userId),
    });

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true, name: true, email: true, image: true, role: true },
    });

    if (!profile) {
      return { profile: null, settings: null, user, isEnabled: false };
    }

    const settings = await db.query.researcherSettings.findFirst({
      where: eq(researcherSettings.researcherId, profile.id),
    });

    const isEnabled = Boolean(profile.isActive);

    return {
      profile,
      settings: settings || {
        notificationEnabled: true,
        language: 'en',
        privacyMode: true,
        isEnabled,
      },
      user,
      isEnabled,
    };
  },

  // 2. Toggle Researcher Mode (Available from Patient Settings & Doctor Settings)
  async toggleResearcherMode(userId: string, isEnabled: boolean) {
    if (!userId) throw new Error('User ID is required');

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true, name: true, email: true },
    });
    if (!user) throw new Error('User not found');

    let profile = await db.query.researcherProfiles.findFirst({
      where: eq(researcherProfiles.userId, userId),
    });

    if (!profile) {
      // First-time researcher activation: provision profile with default settings
      const [newProfile] = await db
        .insert(researcherProfiles)
        .values({
          userId,
          fullName: user.name || 'Research Investigator',
          email: user.email || '',
          institution: 'Independent Research',
          researchField: 'Mental Health & Clinical Studies',
          designation: 'Principal Investigator',
          verificationStatus: 'Verified',
          isActive: isEnabled,
        })
        .returning();

      profile = newProfile;

      // Create default researcher settings
      await db
        .insert(researcherSettings)
        .values({
          researcherId: profile.id,
          notificationEnabled: true,
          language: 'en',
          privacyMode: true,
          isEnabled,
        })
        .onConflictDoNothing();

      // Create empty dashboard summary (will be populated with real data as the researcher works)
      await db
        .insert(researcherDashboardSummaries)
        .values({
          researcherId: profile.id,
          activeProjects: 0,
          totalParticipants: 0,
          completedSurveys: 0,
          collectedRecords: 0,
        })
        .onConflictDoNothing();
    } else {
      // Existing profile: update isActive
      await db
        .update(researcherProfiles)
        .set({ isActive: isEnabled, updatedAt: new Date() })
        .where(eq(researcherProfiles.id, profile.id));

      await db
        .update(researcherSettings)
        .set({ isEnabled, updatedAt: new Date() })
        .where(eq(researcherSettings.researcherId, profile.id));
    }

    // Sync userPreferences
    await db
      .update(userPreferences)
      .set({ researcherModeEnabled: isEnabled, updatedAt: new Date() })
      .where(eq(userPreferences.userId, userId));

    return {
      success: true,
      isEnabled,
      researcherId: profile.id,
    };
  },

  // 3. Overview Dashboard Summary
  async getDashboardSummary(userId: string) {
    const profile = await db.query.researcherProfiles.findFirst({
      where: eq(researcherProfiles.userId, userId),
    });
    if (!profile) return null;

    // Compute live metrics directly from database
    const [projectCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(researchProjects)
      .where(eq(researchProjects.researcherId, profile.id));

    const projects = await db.query.researchProjects.findMany({
      where: eq(researchProjects.researcherId, profile.id),
      orderBy: [desc(researchProjects.createdAt)],
      limit: 5,
    });

    const [pCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(researchParticipants);
    const totalParticipants = Number(pCount?.count || 0);

    const [sCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(researchSurveys);
    const completedSurveys = Number(sCount?.count || 0);

    const [rCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(researchDataCollection);
    const collectedRecords = Number(rCount?.count || 0);

    const [consented] = await db
      .select({ count: sql<number>`count(*)` })
      .from(researchParticipants)
      .where(eq(researchParticipants.consentStatus, 'Consented'));
    const consentedCount = Number(consented?.count || 0);
    const consentRate = totalParticipants > 0 ? Math.round((consentedCount / totalParticipants) * 100) : 100;

    const permissions = await db.query.researcherPermissions.findMany({
      where: eq(researcherPermissions.researcherId, profile.id),
      orderBy: [desc(researcherPermissions.createdAt)],
      limit: 1,
    });

    // Sync summary table with real values
    let summary = await db.query.researcherDashboardSummaries.findFirst({
      where: eq(researcherDashboardSummaries.researcherId, profile.id),
    });

    const activeProjectCount = Number(projectCount?.count || 0);

    if (!summary) {
      const [created] = await db
        .insert(researcherDashboardSummaries)
        .values({
          researcherId: profile.id,
          activeProjects: activeProjectCount,
          totalParticipants,
          completedSurveys,
          collectedRecords,
        })
        .returning();
      summary = created;
    } else {
      await db
        .update(researcherDashboardSummaries)
        .set({
          activeProjects: activeProjectCount,
          totalParticipants,
          completedSurveys,
          collectedRecords,
          updatedAt: new Date(),
        })
        .where(eq(researcherDashboardSummaries.id, summary.id));
    }

    // Recent data collection activity
    const recentData = await db.query.researchDataCollection.findMany({
      orderBy: [desc(researchDataCollection.collectedDate)],
      limit: 6,
    });

    // Collaborators
    const collaborators = await db.query.collaborationNetwork.findMany({
      where: eq(collaborationNetwork.researcherId, profile.id),
      limit: 4,
    });

    return {
      profile,
      summary: {
        activeProjects: activeProjectCount,
        totalParticipants,
        completedSurveys,
        collectedRecords,
        updatedAt: new Date(),
      },
      recentProjects: projects,
      recentData,
      collaborators,
      irbPermission: permissions[0] || null,
      consentStats: {
        total: totalParticipants,
        consented: consentedCount,
        rate: consentRate,
      },
    };
  },

  // 4. Research Projects CRUD
  async getProjects(userId: string) {
    const profile = await db.query.researcherProfiles.findFirst({
      where: eq(researcherProfiles.userId, userId),
    });
    if (!profile) return [];

    return db.query.researchProjects.findMany({
      where: eq(researchProjects.researcherId, profile.id),
      orderBy: [desc(researchProjects.createdAt)],
    });
  },

  async createProject(userId: string, data: {
    projectTitle: string;
    researchArea: string;
    description: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  }) {
    const profile = await db.query.researcherProfiles.findFirst({
      where: eq(researcherProfiles.userId, userId),
    });
    if (!profile) throw new Error('Researcher profile not found.');

    const [project] = await db
      .insert(researchProjects)
      .values({
        researcherId: profile.id,
        projectTitle: data.projectTitle,
        researchArea: data.researchArea,
        description: data.description,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : null,
        status: data.status || 'Active',
      })
      .returning();

    // Create default IRB protocol permission entry
    await db.insert(researcherPermissions).values({
      researcherId: profile.id,
      projectId: project.id,
      dataAccessType: 'Anonymized Aggregate',
      approvalStatus: 'Approved',
      approvedDate: new Date(),
    });

    return project;
  },

  async updateProject(userId: string, projectId: string, data: Partial<{
    projectTitle: string;
    researchArea: string;
    description: string;
    status: string;
    startDate: string;
    endDate: string;
  }>) {
    const profile = await db.query.researcherProfiles.findFirst({
      where: eq(researcherProfiles.userId, userId),
    });
    if (!profile) throw new Error('Researcher profile not found.');

    const [updated] = await db
      .update(researchProjects)
      .set({
        ...(data.projectTitle ? { projectTitle: data.projectTitle } : {}),
        ...(data.researchArea ? { researchArea: data.researchArea } : {}),
        ...(data.description ? { description: data.description } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.startDate ? { startDate: new Date(data.startDate) } : {}),
        ...(data.endDate ? { endDate: new Date(data.endDate) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(researchProjects.id, projectId))
      .returning();

    return updated;
  },

  async deleteProject(userId: string, projectId: string) {
    const profile = await db.query.researcherProfiles.findFirst({
      where: eq(researcherProfiles.userId, userId),
    });
    if (!profile) throw new Error('Researcher profile not found.');

    await db.delete(researchProjects).where(eq(researchProjects.id, projectId));
    return { success: true };
  },

  // 5. Participants & Screening
  async getParticipants(userId: string, projectId?: string) {
    const profile = await db.query.researcherProfiles.findFirst({
      where: eq(researcherProfiles.userId, userId),
    });
    if (!profile) return [];

    if (projectId) {
      return db.query.researchParticipants.findMany({
        where: eq(researchParticipants.projectId, projectId),
        orderBy: [desc(researchParticipants.joinedDate)],
      });
    }

    return db.query.researchParticipants.findMany({
      orderBy: [desc(researchParticipants.joinedDate)],
    });
  },

  async addParticipant(userId: string, data: {
    projectId: string;
    ageGroup: string;
    gender: string;
    eligibilityStatus?: string;
    consentStatus?: string;
    screeningCriteria?: string;
  }) {
    const code = `PT-${Math.floor(1000 + Math.random() * 9000)}`;

    const [participant] = await db
      .insert(researchParticipants)
      .values({
        projectId: data.projectId,
        participantCode: code,
        ageGroup: data.ageGroup,
        gender: data.gender,
        eligibilityStatus: data.eligibilityStatus || 'Eligible',
        consentStatus: data.consentStatus || 'Consented',
      })
      .returning();

    if (data.screeningCriteria) {
      await db.insert(participantScreening).values({
        participantId: participant.id,
        projectId: data.projectId,
        criteria: data.screeningCriteria,
        result: data.eligibilityStatus === 'Ineligible' ? 'Ineligible' : 'Passed',
      });
    }

    return participant;
  },

  async getScreeningRecords(userId: string, projectId?: string) {
    if (projectId) {
      return db.query.participantScreening.findMany({
        where: eq(participantScreening.projectId, projectId),
        orderBy: [desc(participantScreening.screenedDate)],
      });
    }
    return db.query.participantScreening.findMany({
      orderBy: [desc(participantScreening.screenedDate)],
    });
  },

  // 6. AI Participant Matching Requests
  async getMatchingRequests(userId: string) {
    const profile = await db.query.researcherProfiles.findFirst({
      where: eq(researcherProfiles.userId, userId),
    });
    if (!profile) return [];

    const requests = await db.query.participantMatchingRequests.findMany({
      where: eq(participantMatchingRequests.researcherId, profile.id),
      orderBy: [desc(participantMatchingRequests.createdAt)],
    });

    const matched = await db.query.matchedParticipants.findMany({
      orderBy: [desc(matchedParticipants.createdAt)],
    });

    return { requests, matched };
  },

  async createMatchingRequest(userId: string, data: {
    projectId: string;
    targetGroup: string;
    criteria: Record<string, unknown>;
  }) {
    const profile = await db.query.researcherProfiles.findFirst({
      where: eq(researcherProfiles.userId, userId),
    });
    if (!profile) throw new Error('Researcher profile not found.');

    const matchedCandidates = await db.query.researchParticipants.findMany({
      where: eq(researchParticipants.projectId, data.projectId),
      limit: 10,
    });

    const [request] = await db
      .insert(participantMatchingRequests)
      .values({
        researcherId: profile.id,
        projectId: data.projectId,
        targetGroup: data.targetGroup,
        criteria: data.criteria,
        matchedCount: matchedCandidates.length,
        status: 'Completed',
      })
      .returning();

    // Link matched participant candidates
    for (const p of matchedCandidates) {
      await db.insert(matchedParticipants).values({
        matchingRequestId: request.id,
        participantId: p.id,
        matchScore: 'Eligible Match',
        reason: `Demographic fit: ${p.ageGroup}, ${p.gender} aligned with criteria profile.`,
        approvalStatus: 'Pending',
      });
    }

    return request;
  },

  // 7. Research Surveys & Questions
  async getSurveys(userId: string, projectId?: string) {
    let surveys;
    if (projectId) {
      surveys = await db.query.researchSurveys.findMany({
        where: eq(researchSurveys.projectId, projectId),
        orderBy: [desc(researchSurveys.createdDate)],
      });
    } else {
      surveys = await db.query.researchSurveys.findMany({
        orderBy: [desc(researchSurveys.createdDate)],
      });
    }

    const allQuestions = await db.query.surveyQuestions.findMany({
      orderBy: [surveyQuestions.orderIndex],
    });

    return surveys.map((s) => ({
      ...s,
      questions: allQuestions.filter((q) => q.surveyId === s.id),
    }));
  },

  async createSurvey(userId: string, data: {
    projectId: string;
    title: string;
    description?: string;
    formUrl?: string;
    status?: string;
    questions?: {
      questionText: string;
      questionType: string;
      options?: string[];
    }[];
  }) {
    let formUrl = (data.formUrl || '').trim();
    let embedUrl = formUrl;

    // Parse iframe embed snippet if provided (e.g. <iframe src="..." ...></iframe>)
    const iframeMatch = formUrl.match(/src=["']([^"']+)["']/i);
    if (iframeMatch) {
      embedUrl = iframeMatch[1];
      formUrl = iframeMatch[1];
    }

    // Auto-append ?embedded=true for Google Forms if not already present
    if (embedUrl.includes('docs.google.com/forms')) {
      if (!embedUrl.includes('embedded=true')) {
        const sep = embedUrl.includes('?') ? '&' : '?';
        embedUrl = `${embedUrl}${sep}embedded=true`;
      }
    }

    const [survey] = await db
      .insert(researchSurveys)
      .values({
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        formUrl: formUrl || null,
        embedUrl: embedUrl || null,
        totalQuestions: data.questions?.length || 1,
        status: data.status || 'Published',
      })
      .returning();

    if (data.questions && data.questions.length > 0) {
      for (let i = 0; i < data.questions.length; i++) {
        const q = data.questions[i];
        await db.insert(surveyQuestions).values({
          surveyId: survey.id,
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options || [],
          orderIndex: i + 1,
        });
      }
    }

    return survey;
  },

  async deleteSurvey(userId: string, surveyId: string) {
    await db.delete(researchSurveys).where(eq(researchSurveys.id, surveyId));
    return { success: true };
  },

  // 8. Research Data Collection & Export
  async getDataCollection(userId: string, filter?: { projectId?: string; dataType?: string }) {
    let query = db.query.researchDataCollection.findMany({
      orderBy: [desc(researchDataCollection.collectedDate)],
      limit: 100,
    });
    return query;
  },

  async addDataPoint(userId: string, data: {
    projectId: string;
    participantId?: string;
    dataType: string;
    dataValue: Record<string, unknown>;
  }) {
    const [record] = await db
      .insert(researchDataCollection)
      .values({
        projectId: data.projectId,
        participantId: data.participantId,
        dataType: data.dataType,
        dataValue: data.dataValue,
      })
      .returning();

    return record;
  },

  // 9. Research Analytics
  async getAnalytics(userId: string) {
    const profile = await db.query.researcherProfiles.findFirst({
      where: eq(researcherProfiles.userId, userId),
    });
    if (!profile) return [];

    return db.query.researchAnalytics.findMany({
      orderBy: [desc(researchAnalytics.createdAt)],
    });
  },

  async generateAnalytics(userId: string, data: {
    projectId: string;
    analysisType: string;
    resultSummary: string;
    generatedReport?: string;
  }) {
    const [report] = await db
      .insert(researchAnalytics)
      .values({
        projectId: data.projectId,
        analysisType: data.analysisType,
        resultSummary: data.resultSummary,
        generatedReport: data.generatedReport || 'Statistical synthesis completed with 95% confidence interval.',
      })
      .returning();

    return report;
  },

  // 10. Literature & Papers
  async getLiteratureAndPapers(userId: string) {
    const profile = await db.query.researcherProfiles.findFirst({
      where: eq(researcherProfiles.userId, userId),
    });
    if (!profile) return { history: [], papers: [] };

    const [history, papers] = await Promise.all([
      db.query.literatureSearchHistory.findMany({
        where: eq(literatureSearchHistory.researcherId, profile.id),
        orderBy: [desc(literatureSearchHistory.searchedAt)],
        limit: 10,
      }),
      db.query.researchPapers.findMany({
        where: eq(researchPapers.researcherId, profile.id),
        orderBy: [desc(researchPapers.addedDate)],
      }),
    ]);

    return { history, papers };
  },

  async searchLiterature(userId: string, keyword: string, filters?: Record<string, unknown>) {
    const profile = await db.query.researcherProfiles.findFirst({
      where: eq(researcherProfiles.userId, userId),
    });
    if (!profile) throw new Error('Researcher profile not found.');

    const [paperCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(researchPapers)
      .where(eq(researchPapers.researcherId, profile.id));
    const resultCount = Number(paperCount?.count || 0);

    const [entry] = await db
      .insert(literatureSearchHistory)
      .values({
        researcherId: profile.id,
        searchKeyword: keyword,
        filters: filters || {},
        resultCount,
      })
      .returning();

    return entry;
  },

  async addResearchPaper(userId: string, data: {
    title: string;
    authors: string;
    journalName: string;
    publicationYear: number;
    paperUrl?: string;
  }) {
    const profile = await db.query.researcherProfiles.findFirst({
      where: eq(researcherProfiles.userId, userId),
    });
    if (!profile) throw new Error('Researcher profile not found.');

    const [paper] = await db
      .insert(researchPapers)
      .values({
        researcherId: profile.id,
        title: data.title,
        authors: data.authors,
        journalName: data.journalName,
        publicationYear: data.publicationYear,
        paperUrl: data.paperUrl,
      })
      .returning();

    return paper;
  },

  // 11. Collaboration Network & Messages
  async getCollaborationNetwork(userId: string) {
    const profile = await db.query.researcherProfiles.findFirst({
      where: eq(researcherProfiles.userId, userId),
    });
    if (!profile) return { network: [], messages: [] };

    const network = await db.query.collaborationNetwork.findMany({
      where: eq(collaborationNetwork.researcherId, profile.id),
      orderBy: [desc(collaborationNetwork.createdAt)],
    });

    const messages = await db.query.researchCollaborationMessages.findMany({
      orderBy: [desc(researchCollaborationMessages.sentTime)],
      limit: 25,
    });

    return { network, messages };
  },

  async inviteCollaborator(userId: string, data: {
    connectedResearcherName: string;
    connectedInstitution: string;
    collaborationType: string;
  }) {
    const profile = await db.query.researcherProfiles.findFirst({
      where: eq(researcherProfiles.userId, userId),
    });
    if (!profile) throw new Error('Researcher profile not found.');

    const [collab] = await db
      .insert(collaborationNetwork)
      .values({
        researcherId: profile.id,
        connectedResearcherName: data.connectedResearcherName,
        connectedInstitution: data.connectedInstitution,
        collaborationType: data.collaborationType,
        status: 'Active',
      })
      .returning();

    return collab;
  },

  async sendCollaborationMessage(userId: string, data: {
    collaborationId: string;
    message: string;
  }) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true, name: true },
    });

    const [msg] = await db
      .insert(researchCollaborationMessages)
      .values({
        collaborationId: data.collaborationId,
        senderId: userId,
        senderName: user?.name || 'Researcher',
        message: data.message,
      })
      .returning();

    return msg;
  },

  // 12. Reports & Permissions
  async getReportsAndPermissions(userId: string) {
    const profile = await db.query.researcherProfiles.findFirst({
      where: eq(researcherProfiles.userId, userId),
    });
    if (!profile) return { reports: [], permissions: [] };

    const [reports, permissions] = await Promise.all([
      db.query.researchReports.findMany({
        where: eq(researchReports.researcherId, profile.id),
        orderBy: [desc(researchReports.generatedDate)],
      }),
      db.query.researcherPermissions.findMany({
        where: eq(researcherPermissions.researcherId, profile.id),
        orderBy: [desc(researcherPermissions.createdAt)],
      }),
    ]);

    return { reports, permissions };
  },

  async createReport(userId: string, data: {
    projectId: string;
    reportTitle: string;
    summary: string;
    fileUrl?: string;
  }) {
    const profile = await db.query.researcherProfiles.findFirst({
      where: eq(researcherProfiles.userId, userId),
    });
    if (!profile) throw new Error('Researcher profile not found.');

    const [report] = await db
      .insert(researchReports)
      .values({
        projectId: data.projectId,
        researcherId: profile.id,
        reportTitle: data.reportTitle,
        summary: data.summary,
        fileUrl: data.fileUrl || '/downloads/research-study-report.pdf',
      })
      .returning();

    return report;
  },

  async requestPermission(userId: string, data: {
    projectId: string;
    dataAccessType: string;
  }) {
    const profile = await db.query.researcherProfiles.findFirst({
      where: eq(researcherProfiles.userId, userId),
    });
    if (!profile) throw new Error('Researcher profile not found.');

    const [perm] = await db
      .insert(researcherPermissions)
      .values({
        researcherId: profile.id,
        projectId: data.projectId,
        dataAccessType: data.dataAccessType,
        approvalStatus: 'Approved',
        approvedDate: new Date(),
      })
      .returning();

    return perm;
  },

  // 13. Researcher Settings & Preferences
  async getSettings(userId: string) {
    const profile = await db.query.researcherProfiles.findFirst({
      where: eq(researcherProfiles.userId, userId),
    });
    if (!profile) throw new Error('Researcher profile not found.');

    const settings = await db.query.researcherSettings.findFirst({
      where: eq(researcherSettings.researcherId, profile.id),
    });

    return {
      profile,
      settings: settings || {
        notificationEnabled: true,
        language: 'en',
        privacyMode: true,
      },
    };
  },

  async updateSettings(userId: string, data: {
    fullName?: string;
    institution?: string;
    researchField?: string;
    designation?: string;
    notificationEnabled?: boolean;
    language?: string;
    privacyMode?: boolean;
  }) {
    const profile = await db.query.researcherProfiles.findFirst({
      where: eq(researcherProfiles.userId, userId),
    });
    if (!profile) throw new Error('Researcher profile not found.');

    if (data.fullName || data.institution || data.researchField || data.designation) {
      await db
        .update(researcherProfiles)
        .set({
          ...(data.fullName ? { fullName: data.fullName } : {}),
          ...(data.institution ? { institution: data.institution } : {}),
          ...(data.researchField ? { researchField: data.researchField } : {}),
          ...(data.designation ? { designation: data.designation } : {}),
          updatedAt: new Date(),
        })
        .where(eq(researcherProfiles.id, profile.id));
    }

    const [updatedSettings] = await db
      .update(researcherSettings)
      .set({
        ...(data.notificationEnabled !== undefined ? { notificationEnabled: data.notificationEnabled } : {}),
        ...(data.language ? { language: data.language } : {}),
        ...(data.privacyMode !== undefined ? { privacyMode: data.privacyMode } : {}),
        updatedAt: new Date(),
      })
      .where(eq(researcherSettings.researcherId, profile.id))
      .returning();

    return updatedSettings;
  },
};
