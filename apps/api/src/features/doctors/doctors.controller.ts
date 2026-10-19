import { Context } from 'hono';
import { 
  getDoctorProfileByUserId, getOverviewStats, updateDoctorProfileService, 
  updateDoctorSettingsService, addQualificationService, getReviewsService 
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
