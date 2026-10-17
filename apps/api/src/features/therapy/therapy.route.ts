import { Hono } from 'hono';
import {
  requireAuth,
  requireActiveAccount,
  requireProfile,
  requireRole,
} from '../../infra/middleware';
import { TherapyController } from './therapy.controller';

const therapyRouter = new Hono();

therapyRouter.use('*', requireAuth, requireActiveAccount, requireProfile('patient'));

// Programme catalogue — readable by all authenticated patients.
therapyRouter.get('/programs', TherapyController.listPrograms);
therapyRouter.get('/programs/:id', TherapyController.getProgram);

// Programme creation is admin-only — patients consume, admins curate.
therapyRouter.post('/programs', requireRole('admin'), TherapyController.createProgram);

// Personal progress tracking.
therapyRouter.get('/progress', TherapyController.listMyProgress);
therapyRouter.post('/progress/reset-all', TherapyController.resetAllProgress);
therapyRouter.delete('/progress/reset-all', TherapyController.resetAllProgress);
therapyRouter.post('/progress/:resourceId/reset', TherapyController.resetProgramProgress);
therapyRouter.delete('/progress/:resourceId/reset', TherapyController.resetProgramProgress);
therapyRouter.delete('/progress/:resourceId', TherapyController.resetProgramProgress);
therapyRouter.post('/progress/:resourceId', TherapyController.startProgress);
therapyRouter.patch('/progress/:id', TherapyController.updateProgress);

export { therapyRouter };
