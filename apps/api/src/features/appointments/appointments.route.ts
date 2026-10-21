import { Hono } from 'hono';
import {
  requireAuth,
  requireActiveAccount,
} from '../../infra/middleware';
import type { AuthVariables } from '../../infra/middleware/auth';
import { db, doctorProfiles, eq } from '@healer/db';
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
appointmentsRouter.patch('/:id/accept', AppointmentsController.accept);
appointmentsRouter.patch('/:id/decline', AppointmentsController.decline);

// Patient-side specific routes
appointmentsRouter.get('/available-slots', AppointmentsController.getAvailableSlots);
appointmentsRouter.get('/doctors', AppointmentsController.listDoctors);
appointmentsRouter.get('/summaries', AppointmentsController.listVisitSummaries);
appointmentsRouter.get('/summary-by-doctor', AppointmentsController.listVisitSummaries);
appointmentsRouter.get('/prescriptions', AppointmentsController.listPatientPrescriptions);
appointmentsRouter.get('/pending-reviews', AppointmentsController.listPendingReviews);
appointmentsRouter.post('/:id/review', AppointmentsController.submitReview);
appointmentsRouter.post('/', AppointmentsController.create);
appointmentsRouter.patch('/:id/cancel', AppointmentsController.cancel);
appointmentsRouter.patch('/:id/reschedule', AppointmentsController.reschedule);

// Shared / polymorphic routes
appointmentsRouter.post('/sync-lifecycle', AppointmentsController.syncLifecycle);
appointmentsRouter.get('/sync-lifecycle', AppointmentsController.syncLifecycle);
appointmentsRouter.get('/:id', AppointmentsController.getOne);

appointmentsRouter.get('/', async (c) => {
  const user = c.get('user');
  const status = c.req.query('status');
  const role = c.req.query('role');

  if (role === 'patient') {
    return AppointmentsController.listMyAppointments(c);
  }

  if (role === 'doctor' || (status !== undefined && status !== 'all')) {
    return getAppointmentsHandler(c);
  }

  return AppointmentsController.listMyAppointments(c);
});

export { appointmentsRouter };
