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

const CompleteAppointmentSchema = z.object({
  doctorNotes: z.string().max(5000).optional(),
});

export const AppointmentsController = {
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
    try {
      const updated = await AppointmentsService.cancelAppointment(id, user.id);
      if (!updated) return c.json({ error: 'Not Found', message: 'Appointment not found.' }, 404);
      return c.json(updated, 200);
    } catch (err: unknown) {
      logger.error({ err }, 'AppointmentsController.cancel failed');
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      return c.json({ error: 'Internal Server Error', message }, 500);
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
};
