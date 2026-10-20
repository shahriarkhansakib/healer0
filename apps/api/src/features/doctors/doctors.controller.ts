import { Context } from 'hono';
import { 
  getDoctorProfileByUserId, getOverviewStats, updateDoctorProfileService, 
  updateDoctorSettingsService, addQualificationService, getReviewsService,
  getDoctorDirectoryService, getPublicDoctorProfileById, listDoctorSpecializationsService
} from './doctors.service';

export async function getOverviewHandler(c: Context) {
  const user = c.get('user');
  const stats = await getOverviewStats(user.id);
  return c.json({ data: stats });
}

export async function getProfileHandler(c: Context) {
  const user = c.get('user');
  const profile = await getDoctorProfileByUserId(user.id);
  return c.json({ data: profile });
}

export async function updateProfileHandler(c: Context) {
  const user = c.get('user');
  const body = await c.req.json();
  const updated = await updateDoctorProfileService(user.id, body);
  return c.json({ data: updated });
}

export async function updateSettingsHandler(c: Context) {
  const user = c.get('user');
  const body = await c.req.json();
  const updated = await updateDoctorSettingsService(user.id, body);
  return c.json({ data: updated });
}

export async function addQualificationHandler(c: Context) {
  const user = c.get('user');
  const body = await c.req.json();
  const qual = await addQualificationService(user.id, body);
  return c.json({ data: qual }, 201);
}

export async function getReviewsHandler(c: Context) {
  const user = c.get('user');
  const reviews = await getReviewsService(user.id);
  return c.json({ data: reviews });
}

export async function getDoctorDirectoryHandler(c: Context) {
  const search = c.req.query('search');
  const specialization = c.req.query('specialization');
  const availableToday = c.req.query('availableToday') === 'true';

  const directory = await getDoctorDirectoryService({
    search,
    specialization,
    availableToday,
  });

  return c.json({ data: directory });
}

export async function getPublicDoctorProfileHandler(c: Context) {
  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Bad Request', message: 'Doctor ID is required.' }, 400);
  }

  const profile = await getPublicDoctorProfileById(id);
  if (!profile) {
    return c.json({ error: 'Not Found', message: 'Doctor not found.' }, 404);
  }

  return c.json({ data: profile });
}

export async function listSpecializationsHandler(c: Context) {
  const specializations = await listDoctorSpecializationsService();
  return c.json({ data: specializations });
}
