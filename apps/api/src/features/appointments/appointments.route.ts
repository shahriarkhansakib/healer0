import { Hono } from 'hono';
import {
  requireAuth,
  requireActiveAccount,
} from '../../infra/middleware';
import type { AuthVariables } from '../../infra/middleware/auth';
import { 
  getAppointmentsHandler, 
  updateAppointmentStatusHandler, 
  AppointmentsController 
} from './appointments.controller';

const appointmentsRouter = new Hono<{ Variables: AuthVariables }>();

appointmentsRouter.use('*', requireAuth, requireActiveAccount);

// Doctor-side specific routes
appointmentsRouter.get('/doctor/queue', AppointmentsController.listDoctorAppointments);
appointmentsRouter.get('/doctor/patients', AppointmentsController.listDoctorPatients);
appointmentsRouter.patch('/:id/complete', AppointmentsController.complete);
appointmentsRouter.patch('/:id/status', updateAppointmentStatusHandler);

// Patient-side specific routes
appointmentsRouter.get('/doctors', AppointmentsController.listDoctors);
appointmentsRouter.get('/summaries', AppointmentsController.listVisitSummaries);
appointmentsRouter.get('/pending-reviews', AppointmentsController.listPendingReviews);
appointmentsRouter.post('/:id/review', AppointmentsController.submitReview);
appointmentsRouter.post('/', AppointmentsController.create);
appointmentsRouter.patch('/:id/cancel', AppointmentsController.cancel);

// Shared / polymorphic routes
appointmentsRouter.get('/:id', AppointmentsController.getOne);

appointmentsRouter.get('/', async (c) => {
  const user = c.get('user');
  const status = c.req.query('status');
  if (user?.role === 'doctor' || status !== undefined) {
    return getAppointmentsHandler(c);
  }
  return AppointmentsController.listMyAppointments(c);
});

export { appointmentsRouter };
