import { Hono } from 'hono';
import {
  requireAuth,
  requireActiveAccount,
  requireProfile,
  requireRole,
} from '../../infra/middleware';
import { AssessmentsController } from './assessments.controller';

const assessmentsRouter = new Hono();

assessmentsRouter.use('*', requireAuth, requireActiveAccount, requireProfile('patient'));

// Catalogue — all authenticated patients can browse and take assessments.
assessmentsRouter.get('/', AssessmentsController.listAssessments);
assessmentsRouter.get('/:id', AssessmentsController.getAssessment);
assessmentsRouter.post('/:id/submit', AssessmentsController.submitAssessment);

// Assessment authoring is admin-only.
assessmentsRouter.post('/', requireRole('admin'), AssessmentsController.createAssessment);

// Personal results.
assessmentsRouter.get('/results', AssessmentsController.listMyResults);
assessmentsRouter.get('/results/:id', AssessmentsController.getMyResult);

export { assessmentsRouter };
