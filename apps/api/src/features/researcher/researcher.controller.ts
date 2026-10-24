import { Context } from 'hono';
import { ResearcherService } from './researcher.service';
import { logger } from '../../infra/lib/logger';

export const ResearcherController = {
  async getStatus(c: Context) {
    try {
      const user = c.get('user') ?? (c.get('sessionData' as any) as any)?.user;
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const status = await ResearcherService.getResearcherProfile(user.id);
      return c.json({ data: status });
    } catch (err: unknown) {
      logger.error({ err }, 'ResearcherController.getStatus failed');
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async toggleMode(c: Context) {
    try {
      const user = c.get('user') ?? (c.get('sessionData' as any) as any)?.user;
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const body = await c.req.json().catch(() => ({}));
      const isEnabled = typeof body.isEnabled === 'boolean' ? body.isEnabled : true;

      const result = await ResearcherService.toggleResearcherMode(user.id, isEnabled);
      return c.json({ data: result });
    } catch (err: unknown) {
      logger.error({ err }, 'ResearcherController.toggleMode failed');
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async getDashboardSummary(c: Context) {
    try {
      const user = c.get('user') ?? (c.get('sessionData' as any) as any)?.user;
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const summary = await ResearcherService.getDashboardSummary(user.id);
      return c.json({ data: summary });
    } catch (err: unknown) {
      logger.error({ err }, 'ResearcherController.getDashboardSummary failed');
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async getProjects(c: Context) {
    try {
      const user = c.get('user') ?? (c.get('sessionData' as any) as any)?.user;
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const projects = await ResearcherService.getProjects(user.id);
      return c.json({ data: projects });
    } catch (err: unknown) {
      logger.error({ err }, 'ResearcherController.getProjects failed');
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async createProject(c: Context) {
    try {
      const user = c.get('user') ?? (c.get('sessionData' as any) as any)?.user;
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const body = await c.req.json();
      if (!body.projectTitle || !body.researchArea || !body.description) {
        return c.json({ error: 'Bad Request', message: 'Title, area, and description are required.' }, 400);
      }

      const project = await ResearcherService.createProject(user.id, body);
      return c.json({ data: project }, 201);
    } catch (err: unknown) {
      logger.error({ err }, 'ResearcherController.createProject failed');
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async updateProject(c: Context) {
    try {
      const user = c.get('user') ?? (c.get('sessionData' as any) as any)?.user;
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const id = c.req.param('id');
      if (!id) return c.json({ error: 'Bad Request', message: 'Missing project ID' }, 400);
      const body = await c.req.json();
      const updated = await ResearcherService.updateProject(user.id, id, body);
      return c.json({ data: updated });
    } catch (err: unknown) {
      logger.error({ err }, 'ResearcherController.updateProject failed');
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async deleteProject(c: Context) {
    try {
      const user = c.get('user') ?? (c.get('sessionData' as any) as any)?.user;
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const id = c.req.param('id');
      if (!id) return c.json({ error: 'Bad Request', message: 'Missing project ID' }, 400);
      await ResearcherService.deleteProject(user.id, id);
      return c.json({ success: true });
    } catch (err: unknown) {
      logger.error({ err }, 'ResearcherController.deleteProject failed');
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async getParticipants(c: Context) {
    try {
      const user = c.get('user') ?? (c.get('sessionData' as any) as any)?.user;
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const projectId = c.req.query('projectId');
      const participants = await ResearcherService.getParticipants(user.id, projectId);
      return c.json({ data: participants });
    } catch (err: unknown) {
      logger.error({ err }, 'ResearcherController.getParticipants failed');
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async addParticipant(c: Context) {
    try {
      const user = c.get('user') ?? (c.get('sessionData' as any) as any)?.user;
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const body = await c.req.json();
      if (!body.projectId || !body.ageGroup || !body.gender) {
        return c.json({ error: 'Bad Request', message: 'Project, age group, and gender are required.' }, 400);
      }

      const participant = await ResearcherService.addParticipant(user.id, body);
      return c.json({ data: participant }, 201);
    } catch (err: unknown) {
      logger.error({ err }, 'ResearcherController.addParticipant failed');
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async getScreeningRecords(c: Context) {
    try {
      const user = c.get('user') ?? (c.get('sessionData' as any) as any)?.user;
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const projectId = c.req.query('projectId');
      const records = await ResearcherService.getScreeningRecords(user.id, projectId);
      return c.json({ data: records });
    } catch (err: unknown) {
      logger.error({ err }, 'ResearcherController.getScreeningRecords failed');
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async getMatchingRequests(c: Context) {
    try {
      const user = c.get('user') ?? (c.get('sessionData' as any) as any)?.user;
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const data = await ResearcherService.getMatchingRequests(user.id);
      return c.json({ data });
    } catch (err: unknown) {
      logger.error({ err }, 'ResearcherController.getMatchingRequests failed');
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async createMatchingRequest(c: Context) {
    try {
      const user = c.get('user') ?? (c.get('sessionData' as any) as any)?.user;
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const body = await c.req.json();
      const request = await ResearcherService.createMatchingRequest(user.id, body);
      return c.json({ data: request }, 201);
    } catch (err: unknown) {
      logger.error({ err }, 'ResearcherController.createMatchingRequest failed');
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async getSurveys(c: Context) {
    try {
      const user = c.get('user') ?? (c.get('sessionData' as any) as any)?.user;
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const projectId = c.req.query('projectId');
      const surveys = await ResearcherService.getSurveys(user.id, projectId);
      return c.json({ data: surveys });
    } catch (err: unknown) {
      logger.error({ err }, 'ResearcherController.getSurveys failed');
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async createSurvey(c: Context) {
    try {
      const user = c.get('user') ?? (c.get('sessionData' as any) as any)?.user;
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const body = await c.req.json();
      const survey = await ResearcherService.createSurvey(user.id, body);
      return c.json({ data: survey }, 201);
    } catch (err: unknown) {
      logger.error({ err }, 'ResearcherController.createSurvey failed');
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async deleteSurvey(c: Context) {
    try {
      const user = c.get('user') ?? (c.get('sessionData' as any) as any)?.user;
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const id = c.req.param('id');
      if (!id) return c.json({ error: 'Bad Request', message: 'Missing survey ID' }, 400);
      await ResearcherService.deleteSurvey(user.id, id);
      return c.json({ success: true });
    } catch (err: unknown) {
      logger.error({ err }, 'ResearcherController.deleteSurvey failed');
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async getDataCollection(c: Context) {
    try {
      const user = c.get('user') ?? (c.get('sessionData' as any) as any)?.user;
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const records = await ResearcherService.getDataCollection(user.id);
      return c.json({ data: records });
    } catch (err: unknown) {
      logger.error({ err }, 'ResearcherController.getDataCollection failed');
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async addDataPoint(c: Context) {
    try {
      const user = c.get('user') ?? (c.get('sessionData' as any) as any)?.user;
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const body = await c.req.json();
      const record = await ResearcherService.addDataPoint(user.id, body);
      return c.json({ data: record }, 201);
    } catch (err: unknown) {
      logger.error({ err }, 'ResearcherController.addDataPoint failed');
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async getAnalytics(c: Context) {
    try {
      const user = c.get('user') ?? (c.get('sessionData' as any) as any)?.user;
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const analytics = await ResearcherService.getAnalytics(user.id);
      return c.json({ data: analytics });
    } catch (err: unknown) {
      logger.error({ err }, 'ResearcherController.getAnalytics failed');
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async generateAnalytics(c: Context) {
    try {
      const user = c.get('user') ?? (c.get('sessionData' as any) as any)?.user;
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const body = await c.req.json();
      const report = await ResearcherService.generateAnalytics(user.id, body);
      return c.json({ data: report }, 201);
    } catch (err: unknown) {
      logger.error({ err }, 'ResearcherController.generateAnalytics failed');
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async getLiterature(c: Context) {
    try {
      const user = c.get('user') ?? (c.get('sessionData' as any) as any)?.user;
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const data = await ResearcherService.getLiteratureAndPapers(user.id);
      return c.json({ data });
    } catch (err: unknown) {
      logger.error({ err }, 'ResearcherController.getLiterature failed');
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async searchLiterature(c: Context) {
    try {
      const user = c.get('user') ?? (c.get('sessionData' as any) as any)?.user;
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const body = await c.req.json();
      if (!body.keyword) return c.json({ error: 'Bad Request', message: 'Keyword is required.' }, 400);

      const entry = await ResearcherService.searchLiterature(user.id, body.keyword, body.filters);
      return c.json({ data: entry }, 201);
    } catch (err: unknown) {
      logger.error({ err }, 'ResearcherController.searchLiterature failed');
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async addPaper(c: Context) {
    try {
      const user = c.get('user') ?? (c.get('sessionData' as any) as any)?.user;
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const body = await c.req.json();
      const paper = await ResearcherService.addResearchPaper(user.id, body);
      return c.json({ data: paper }, 201);
    } catch (err: unknown) {
      logger.error({ err }, 'ResearcherController.addPaper failed');
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async getCollaboration(c: Context) {
    try {
      const user = c.get('user') ?? (c.get('sessionData' as any) as any)?.user;
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const data = await ResearcherService.getCollaborationNetwork(user.id);
      return c.json({ data });
    } catch (err: unknown) {
      logger.error({ err }, 'ResearcherController.getCollaboration failed');
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async inviteCollaborator(c: Context) {
    try {
      const user = c.get('user') ?? (c.get('sessionData' as any) as any)?.user;
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const body = await c.req.json();
      const collab = await ResearcherService.inviteCollaborator(user.id, body);
      return c.json({ data: collab }, 201);
    } catch (err: unknown) {
      logger.error({ err }, 'ResearcherController.inviteCollaborator failed');
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async sendCollaborationMessage(c: Context) {
    try {
      const user = c.get('user') ?? (c.get('sessionData' as any) as any)?.user;
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const body = await c.req.json();
      const msg = await ResearcherService.sendCollaborationMessage(user.id, body);
      return c.json({ data: msg }, 201);
    } catch (err: unknown) {
      logger.error({ err }, 'ResearcherController.sendCollaborationMessage failed');
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async getReportsAndPermissions(c: Context) {
    try {
      const user = c.get('user') ?? (c.get('sessionData' as any) as any)?.user;
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const data = await ResearcherService.getReportsAndPermissions(user.id);
      return c.json({ data });
    } catch (err: unknown) {
      logger.error({ err }, 'ResearcherController.getReportsAndPermissions failed');
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async createReport(c: Context) {
    try {
      const user = c.get('user') ?? (c.get('sessionData' as any) as any)?.user;
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const body = await c.req.json();
      const report = await ResearcherService.createReport(user.id, body);
      return c.json({ data: report }, 201);
    } catch (err: unknown) {
      logger.error({ err }, 'ResearcherController.createReport failed');
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async requestPermission(c: Context) {
    try {
      const user = c.get('user') ?? (c.get('sessionData' as any) as any)?.user;
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const body = await c.req.json();
      const perm = await ResearcherService.requestPermission(user.id, body);
      return c.json({ data: perm }, 201);
    } catch (err: unknown) {
      logger.error({ err }, 'ResearcherController.requestPermission failed');
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async getSettings(c: Context) {
    try {
      const user = c.get('user') ?? (c.get('sessionData' as any) as any)?.user;
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const data = await ResearcherService.getSettings(user.id);
      return c.json({ data });
    } catch (err: unknown) {
      logger.error({ err }, 'ResearcherController.getSettings failed');
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async updateSettings(c: Context) {
    try {
      const user = c.get('user') ?? (c.get('sessionData' as any) as any)?.user;
      if (!user) return c.json({ error: 'Unauthorized' }, 401);

      const body = await c.req.json();
      const settings = await ResearcherService.updateSettings(user.id, body);
      return c.json({ data: settings });
    } catch (err: unknown) {
      logger.error({ err }, 'ResearcherController.updateSettings failed');
      const message = err instanceof Error ? err.message : 'Unknown error';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },
};
