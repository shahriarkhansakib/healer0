import { Hono } from 'hono';
import { requireAuth, requireActiveAccount } from '../../infra/middleware';
import { ResearcherController } from './researcher.controller';

const researcherRouter = new Hono();

// All researcher endpoints require an authenticated and active account
researcherRouter.use('*', requireAuth, requireActiveAccount);

// Mode Toggle & Status Check (Accessible by anyone to toggle researcher mode in settings)
researcherRouter.get('/status', ResearcherController.getStatus);
researcherRouter.post('/toggle-mode', ResearcherController.toggleMode);

// Dashboard Overview
researcherRouter.get('/dashboard', ResearcherController.getDashboardSummary);

// Projects & Studies
researcherRouter.get('/projects', ResearcherController.getProjects);
researcherRouter.post('/projects', ResearcherController.createProject);
researcherRouter.put('/projects/:id', ResearcherController.updateProject);
researcherRouter.delete('/projects/:id', ResearcherController.deleteProject);

// Participants & Screening
researcherRouter.get('/participants', ResearcherController.getParticipants);
researcherRouter.post('/participants', ResearcherController.addParticipant);
researcherRouter.get('/screening', ResearcherController.getScreeningRecords);

// Matching
researcherRouter.get('/matching', ResearcherController.getMatchingRequests);
researcherRouter.post('/matching', ResearcherController.createMatchingRequest);

// Surveys
researcherRouter.get('/surveys', ResearcherController.getSurveys);
researcherRouter.post('/surveys', ResearcherController.createSurvey);
researcherRouter.delete('/surveys/:id', ResearcherController.deleteSurvey);

// Data Collection
researcherRouter.get('/data', ResearcherController.getDataCollection);
researcherRouter.post('/data', ResearcherController.addDataPoint);

// Analytics
researcherRouter.get('/analytics', ResearcherController.getAnalytics);
researcherRouter.post('/analytics', ResearcherController.generateAnalytics);

// Literature & Papers
researcherRouter.get('/literature', ResearcherController.getLiterature);
researcherRouter.post('/literature/search', ResearcherController.searchLiterature);
researcherRouter.post('/papers', ResearcherController.addPaper);

// Collaboration Network
researcherRouter.get('/collaboration', ResearcherController.getCollaboration);
researcherRouter.post('/collaboration/invite', ResearcherController.inviteCollaborator);
researcherRouter.post('/collaboration/messages', ResearcherController.sendCollaborationMessage);

// Reports & IRB Permissions
researcherRouter.get('/reports', ResearcherController.getReportsAndPermissions);
researcherRouter.post('/reports', ResearcherController.createReport);
researcherRouter.post('/permissions', ResearcherController.requestPermission);

// Researcher Settings
researcherRouter.get('/settings', ResearcherController.getSettings);
researcherRouter.put('/settings', ResearcherController.updateSettings);

export { researcherRouter };
