import { Hono } from 'hono';
import { requireAuth } from '../../infra/middleware/auth';
import { requireProfile } from '../../infra/middleware/profile';
import { 
  getOverviewHandler, getProfileHandler, updateProfileHandler, 
  updateSettingsHandler, addQualificationHandler, getReviewsHandler,
  getDoctorDirectoryHandler, getPublicDoctorProfileHandler, listSpecializationsHandler 
} from './doctors.controller';

const doctorsRouter = new Hono();

// All doctor routes require an active authenticated session
doctorsRouter.use('*', requireAuth);

// 1. Directory Routes (accessible to all authenticated users including patients)
doctorsRouter.get('/directory', getDoctorDirectoryHandler);
doctorsRouter.get('/specializations', listSpecializationsHandler);
doctorsRouter.get('/:id/public', getPublicDoctorProfileHandler);

// 2. Doctor Self-Management Routes (strictly requires a verified doctor profile)
const doctorSelfRouter = new Hono();
doctorSelfRouter.use('*', requireProfile('doctor'));

doctorSelfRouter.get('/overview', getOverviewHandler);
doctorSelfRouter.get('/profile', getProfileHandler);
doctorSelfRouter.put('/profile', updateProfileHandler);
doctorSelfRouter.put('/settings', updateSettingsHandler);
doctorSelfRouter.post('/qualifications', addQualificationHandler);
doctorSelfRouter.get('/reviews', getReviewsHandler);

doctorsRouter.route('/', doctorSelfRouter);

export { doctorsRouter };
