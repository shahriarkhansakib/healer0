import { Hono } from 'hono';
import { requireAuth } from '../../infra/middleware/auth';
import { requireProfile } from '../../infra/middleware/profile';
import { getCounselingSessionsHandler, updateCounselingStatusHandler } from './counseling.controller';

const counselingRouter = new Hono();

counselingRouter.use('*', requireAuth);
counselingRouter.use('*', requireProfile('doctor'));

counselingRouter.get('/sessions', getCounselingSessionsHandler);
counselingRouter.patch('/sessions/:id/status', updateCounselingStatusHandler);

export { counselingRouter };
