import { Hono } from 'hono';
import {
  requireAuth,
  requireActiveAccount,
} from '../../infra/middleware';
import type { AuthVariables } from '../../infra/middleware/auth';
import { 
  getCounselingSessionsHandler, 
  updateCounselingStatusHandler, 
  CounselingController 
} from './counseling.controller';

const counselingRouter = new Hono<{ Variables: AuthVariables }>();

counselingRouter.use('*', requireAuth, requireActiveAccount);

counselingRouter.get('/sessions', async (c) => {
  const user = c.get('user');
  if (user?.role === 'doctor') {
    return getCounselingSessionsHandler(c);
  }
  return CounselingController.listSessions(c);
});

counselingRouter.patch('/sessions/:id/status', updateCounselingStatusHandler);
counselingRouter.post('/sessions', CounselingController.createSession);
counselingRouter.get('/sessions/:id', CounselingController.getSession);
counselingRouter.patch('/sessions/:id/end', CounselingController.endSession);
counselingRouter.post('/sessions/:sessionId/messages', CounselingController.sendMessage);
counselingRouter.get('/sessions/:sessionId/messages', CounselingController.getMessages);

export { counselingRouter };
