import { Hono } from 'hono';
import {
  requireAuth,
  requireActiveAccount,
  requireProfile,
} from '../../infra/middleware';
import { CounselingController } from './counseling.controller';

const counselingRouter = new Hono();

counselingRouter.use('*', requireAuth, requireActiveAccount, requireProfile('patient'));

counselingRouter.post('/sessions', CounselingController.createSession);
counselingRouter.get('/sessions', CounselingController.listSessions);
counselingRouter.get('/sessions/:id', CounselingController.getSession);
counselingRouter.patch('/sessions/:id/end', CounselingController.endSession);
counselingRouter.post('/sessions/:sessionId/messages', CounselingController.sendMessage);
counselingRouter.get('/sessions/:sessionId/messages', CounselingController.getMessages);

export { counselingRouter };
