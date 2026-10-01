import { Hono } from 'hono';
import { requireAuth } from '../../infra/middleware/auth';
import { requireProfile } from '../../infra/middleware/profile';
import { getDoctorPatientsHandler, updatePatientRiskHandler } from './patients.controller';

const patientsRouter = new Hono();

patientsRouter.use('*', requireAuth);
patientsRouter.use('*', requireProfile('doctor'));

patientsRouter.get('/', getDoctorPatientsHandler);
patientsRouter.patch('/:id/risk', updatePatientRiskHandler);

export { patientsRouter };
