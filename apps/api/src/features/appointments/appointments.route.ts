import { Hono } from 'hono';
import {
  requireAuth,
  requireActiveAccount,
  requireProfile,
} from '../../infra/middleware';
import { AppointmentsController } from './appointments.controller';

const appointmentsRouter = new Hono();

appointmentsRouter.use('*', requireAuth, requireActiveAccount, requireProfile('patient'));

// Patient-side: book, view, and cancel appointments.
appointmentsRouter.get('/doctors', AppointmentsController.listDoctors);
appointmentsRouter.post('/', AppointmentsController.create);
appointmentsRouter.get('/', AppointmentsController.listMyAppointments);
appointmentsRouter.get('/summaries', AppointmentsController.listVisitSummaries);
appointmentsRouter.get('/:id', AppointmentsController.getOne);
appointmentsRouter.patch('/:id/cancel', AppointmentsController.cancel);

// Doctor-side: mark appointment as completed and attach clinical notes.
appointmentsRouter.patch('/:id/complete', requireProfile('doctor'), AppointmentsController.complete);
appointmentsRouter.get('/doctor/queue', requireProfile('doctor'), AppointmentsController.listDoctorAppointments);
appointmentsRouter.get('/doctor/patients', requireProfile('doctor'), AppointmentsController.listDoctorPatients);

export { appointmentsRouter };
