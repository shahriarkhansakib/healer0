import { Hono } from 'hono';
import {
  requireAuth,
  requireActiveAccount,
  requireProfile,
  requireRole,
} from '../../infra/middleware';
import { TherapyController } from './therapy.controller';

const therapyRouter = new Hono();

therapyRouter.use('*', requireAuth, requireActiveAccount);

// Programme creation is admin-only — patients consume, admins curate.
therapyRouter.post('/programs', requireRole('admin'), TherapyController.createProgram);

// Programme catalogue — readable by all authenticated patients.
therapyRouter.get('/programs', requireProfile('patient'), TherapyController.listPrograms);
therapyRouter.get('/programs/:id', requireProfile('patient'), TherapyController.getProgram);

// Personal progress tracking.
therapyRouter.get('/progress', requireProfile('patient'), TherapyController.listMyProgress);
therapyRouter.post('/progress/reset-all', requireProfile('patient'), TherapyController.resetAllProgress);
therapyRouter.delete('/progress/reset-all', requireProfile('patient'), TherapyController.resetAllProgress);
therapyRouter.post('/progress/:resourceId/reset', requireProfile('patient'), TherapyController.resetProgramProgress);
therapyRouter.delete('/progress/:resourceId/reset', requireProfile('patient'), TherapyController.resetProgramProgress);
therapyRouter.delete('/progress/:resourceId', requireProfile('patient'), TherapyController.resetProgramProgress);
therapyRouter.post('/progress/:resourceId', requireProfile('patient'), TherapyController.startProgress);
therapyRouter.patch('/progress/:id', requireProfile('patient'), TherapyController.updateProgress);

export { therapyRouter };
