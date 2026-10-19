import { Hono } from 'hono';
import {
  requireAuth,
  requireActiveAccount,
} from '../../infra/middleware';
import type { AuthVariables } from '../../infra/middleware/auth';
import { 
  getDoctorPatientsHandler, 
  updatePatientRiskHandler, 
  PatientsController 
} from './patients.controller';

const patientsRouter = new Hono<{ Variables: AuthVariables }>();

patientsRouter.use('*', requireAuth, requireActiveAccount);

patientsRouter.get('/', async (c) => {
  const user = c.get('user');
  if (user?.role === 'admin' || user?.role === 'super_admin') {
    return PatientsController.list(c);
  }
  return getDoctorPatientsHandler(c);
});

patientsRouter.patch('/:id/risk', updatePatientRiskHandler);

export { patientsRouter };
