import type { Context } from 'hono';
import { z } from 'zod';
import type { AuthVariables } from '../../infra/middleware/auth';
import { 
  getAppointmentsService, 
  updateAppointmentStatusService, 
  AppointmentsService 
} from './appointments.service';
import { logger } from '../../infra/lib/logger';
import { requireParam } from '../../infra/lib/param-guard';

export async function getAppointmentsHandler(c: Context) {
  const user = c.get('user');
  if (!user?.id) throw new Error('Unauthorized');
  const status = c.req.query('status');
  const appts = await getAppointmentsService(user.id, status);
  return c.json({ data: appts });
}

export async function updateAppointmentStatusHandler(c: Context) {
  const user = c.get('user');
  if (!user?.id) throw new Error('Unauthorized');
  const id = c.req.param('id');
  if (!id) throw new Error('Appointment ID is required');
  const body = await c.req.json();
  const updated = await updateAppointmentStatusService(user.id, id, body.status);
  return c.json({ data: updated });
}

const CreateAppointmentSchema = z.object({
  doctorId: z.string().min(1),
  appointmentDate: z.string().datetime({ message: 'Must be a valid ISO 8601 datetime.' }),
  consultationType: z.enum(['Chat', 'Video', 'Physical']),
  consultationReason: z.string().max(1000).optional(),
  sessionDurationMinutes: z.number().int().min(15).max(240).optional(),
});

const RescheduleAppointmentSchema = z.object({
  newDate: z.string().datetime({ message: 'Must be a valid ISO 8601 datetime.' }),
  consultationType: z.enum(['Chat', 'Video', 'Physical']).optional(),
  reason: z.string().max(1000).optional(),
});

const CancelAppointmentSchema = z.object({
  reason: z.string().max(1000).optional(),
});

const DeclineAppointmentSchema = z.object({
  reason: z.string().max(1000).optional(),
});

const CompleteAppointmentSchema = z.object({
  doctorNotes: z.string().max(5000).optional(),
});

const SubmitReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

const GetAvailableSlotsSchema = z.object({
  doctorId: z.string().min(1, 'Doctor ID is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'),
  durationMinutes: z.coerce.number().int().min(15).max(180).optional(),
});

export const AppointmentsController = {
  async getAvailableSlots(c: Context<{ Variables: AuthVariables }>) {
    const query = {
      doctorId: c.req.query('doctorId'),
      date: c.req.query('date'),
      durationMinutes: c.req.query('durationMinutes'),
    };
    const parsed = GetAvailableSlotsSchema.safeParse(query);
    if (!parsed.success) {
      return c.json({ error: 'Bad Request', message: parsed.error.flatten().fieldErrors }, 400);
    }
    try {
      const availability = await AppointmentsService.getDoctorAvailableSlots(
        parsed.data.doctorId,
        parsed.data.date,
        parsed.data.durationMinutes
      );
      return c.json(availability, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'AppointmentsController.getAvailableSlots failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },
  async create(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const rawBody = await c.req.json().catch(() => null);
    const parsed = CreateAppointmentSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ error: 'Bad Request', message: parsed.error.flatten().fieldErrors }, 400);
    }
    try {
      const appointment = await AppointmentsService.createAppointment(user.id, parsed.data);
      if (!appointment) {
        return c.json({ error: 'Bad Request', message: 'The specified doctor does not exist.' }, 400);
      }
      return c.json(appointment, 201);
    } catch (err: unknown) {
      logger.error({ err }, 'AppointmentsController.create failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async listMyAppointments(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    try {
      const appts = await AppointmentsService.listAppointmentsForPatient(user.id);
      return c.json(appts, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'AppointmentsController.listMyAppointments failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async getOne(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const id = requireParam(c, 'id');
    try {
      const appointment = await AppointmentsService.getAppointmentById(id, user.id);
      if (!appointment) return c.json({ error: 'Not Found', message: 'Appointment not found.' }, 404);
      return c.json(appointment, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'AppointmentsController.getOne failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async cancel(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const id = requireParam(c, 'id');
    const rawBody = await c.req.json().catch(() => ({}));
    const parsed = CancelAppointmentSchema.safeParse(rawBody);
    const reason = parsed.success ? parsed.data.reason : undefined;
    try {
      const updated = await AppointmentsService.cancelAppointment(id, user.id, user.role, reason);
      if (!updated) return c.json({ error: 'Not Found', message: 'Appointment not found.' }, 404);
      return c.json(updated, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'AppointmentsController.cancel failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Bad Request', message }, 400);
    }
  },

  async accept(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const id = requireParam(c, 'id');
    try {
      const updated = await AppointmentsService.acceptAppointment(id, user.id);
      if (!updated) return c.json({ error: 'Not Found', message: 'Appointment not found or not in pending state.' }, 404);
      return c.json(updated, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'AppointmentsController.accept failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Bad Request', message }, 400);
    }
  },

  async decline(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const id = requireParam(c, 'id');
    const rawBody = await c.req.json().catch(() => ({}));
    const parsed = DeclineAppointmentSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ error: 'Bad Request', message: parsed.error.flatten().fieldErrors }, 400);
    }
    try {
      const updated = await AppointmentsService.declineAppointment(id, user.id, parsed.data.reason);
      if (!updated) return c.json({ error: 'Not Found', message: 'Appointment not found or not in pending state.' }, 404);
      return c.json(updated, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'AppointmentsController.decline failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Bad Request', message }, 400);
    }
  },

  async reschedule(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const id = requireParam(c, 'id');
    const rawBody = await c.req.json().catch(() => ({}));
    const parsed = RescheduleAppointmentSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ error: 'Bad Request', message: parsed.error.flatten().fieldErrors }, 400);
    }
    try {
      const updated = await AppointmentsService.rescheduleAppointment(id, user.id, user.role, parsed.data);
      if (!updated) return c.json({ error: 'Not Found', message: 'Appointment not found.' }, 404);
      return c.json(updated, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'AppointmentsController.reschedule failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Bad Request', message }, 400);
    }
  },

  async complete(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const id = requireParam(c, 'id');
    const rawBody = await c.req.json().catch(() => ({}));
    const parsed = CompleteAppointmentSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ error: 'Bad Request', message: parsed.error.flatten().fieldErrors }, 400);
    }
    try {
      const updated = await AppointmentsService.completeAppointment(id, user.id, parsed.data.doctorNotes);
      if (!updated) return c.json({ error: 'Not Found', message: 'Appointment not found.' }, 404);
      return c.json(updated, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'AppointmentsController.complete failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async listVisitSummaries(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    try {
      const summaries = await AppointmentsService.listVisitSummariesForPatient(user.id);
      return c.json(summaries, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'AppointmentsController.listVisitSummaries failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async listDoctorAppointments(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    try {
      const appts = await AppointmentsService.listAppointmentsForDoctor(user.id);
      return c.json(appts, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'AppointmentsController.listDoctorAppointments failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async listDoctorPatients(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    try {
      const summaries = await AppointmentsService.listVisitSummariesForDoctor(user.id);
      return c.json(summaries, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'AppointmentsController.listDoctorPatients failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async listDoctors(c: Context<{ Variables: AuthVariables }>) {
    try {
      const doctors = await AppointmentsService.listVerifiedDoctors();
      return c.json(doctors, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'AppointmentsController.listDoctors failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async listPendingReviews(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    try {
      const pending = await AppointmentsService.listPendingReviewsForPatient(user.id);
      return c.json(pending, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'AppointmentsController.listPendingReviews failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async submitReview(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    const id = requireParam(c, 'id');
    const rawBody = await c.req.json().catch(() => null);
    const parsed = SubmitReviewSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ error: 'Bad Request', message: parsed.error.flatten().fieldErrors }, 400);
    }
    try {
      const review = await AppointmentsService.submitAppointmentReview(user.id, id, parsed.data);
      return c.json({ success: true, review }, 201);
    } catch (err: unknown) {
      logger.error({ err }, 'AppointmentsController.submitReview failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async listPatientPrescriptions(c: Context<{ Variables: AuthVariables }>) {
    const user = c.get('user');
    try {
      const rxList = await AppointmentsService.listPrescriptionsForPatient(user.id);
      return c.json(rxList, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'AppointmentsController.listPatientPrescriptions failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },

  async syncLifecycle(c: Context<{ Variables: AuthVariables }>) {
    try {
      const result = await AppointmentsService.syncAllActiveLifecycles();
      return c.json({ success: true, ...result }, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'AppointmentsController.syncLifecycle failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
    }
  },
};
