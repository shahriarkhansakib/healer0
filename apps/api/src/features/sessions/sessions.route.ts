import { Hono } from 'hono';
import { requireAuth } from '../../infra/middleware/auth';
import { requireProfile } from '../../infra/middleware/profile';
import { 
  getSessionNotesHandler, createSessionNoteHandler, 
  getPrescriptionsHandler, createPrescriptionHandler 
} from './sessions.controller';

const sessionsRouter = new Hono();

sessionsRouter.use('*', requireAuth);
sessionsRouter.use('*', requireProfile('doctor'));

sessionsRouter.get('/notes', getSessionNotesHandler);
sessionsRouter.post('/notes', createSessionNoteHandler);

sessionsRouter.get('/prescriptions', getPrescriptionsHandler);
sessionsRouter.post('/prescriptions', createPrescriptionHandler);

export { sessionsRouter };
