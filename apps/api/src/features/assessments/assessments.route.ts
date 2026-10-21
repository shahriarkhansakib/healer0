import { Hono } from 'hono';
import {
  requireAuth,
  requireActiveAccount,
  requireProfile,
  requireRole,
} from '../../infra/middleware';
import { AssessmentsController } from './assessments.controller';

const assessmentsRouter = new Hono();

assessmentsRouter.use('*', requireAuth, requireActiveAccount);

// Personal results (declared before wildcard /:id to prevent route shadowing)
assessmentsRouter.get('/results', requireProfile('patient'), AssessmentsController.listMyResults);
assessmentsRouter.get('/results/:id', requireProfile('patient'), AssessmentsController.getMyResult);

// Catalogue & submission
assessmentsRouter.get('/', requireProfile('patient'), AssessmentsController.listAssessments);
assessmentsRouter.get('/:id', requireProfile('patient'), AssessmentsController.getAssessment);
assessmentsRouter.post('/:id/submit', requireProfile('patient'), AssessmentsController.submitAssessment);

// Assessment authoring (admin-only)
assessmentsRouter.post('/', requireRole('admin'), AssessmentsController.createAssessment);

export { assessmentsRouter };
