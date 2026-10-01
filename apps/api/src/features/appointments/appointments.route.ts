import { Hono } from 'hono';
import { requireAuth } from '../../infra/middleware/auth';
import { requireProfile } from '../../infra/middleware/profile';
import { getAppointmentsHandler, updateAppointmentStatusHandler } from './appointments.controller';

const appointmentsRouter = new Hono();

appointmentsRouter.use('*', requireAuth);
appointmentsRouter.use('*', requireProfile('doctor'));

appointmentsRouter.get('/', getAppointmentsHandler);
appointmentsRouter.patch('/:id/status', updateAppointmentStatusHandler);

export { appointmentsRouter };
