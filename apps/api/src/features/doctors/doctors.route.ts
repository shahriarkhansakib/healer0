import { Hono } from 'hono';
import { requireAuth } from '../../infra/middleware/auth';
import { requireProfile } from '../../infra/middleware/profile';
import { 
  getOverviewHandler, getProfileHandler, updateProfileHandler, 
  updateSettingsHandler, addQualificationHandler, getReviewsHandler 
} from './doctors.controller';

const doctorsRouter = new Hono();

doctorsRouter.use('*', requireAuth);
doctorsRouter.use('*', requireProfile('doctor'));

doctorsRouter.get('/overview', getOverviewHandler);
doctorsRouter.get('/profile', getProfileHandler);
doctorsRouter.put('/profile', updateProfileHandler);
doctorsRouter.put('/settings', updateSettingsHandler);
doctorsRouter.post('/qualifications', addQualificationHandler);
doctorsRouter.get('/reviews', getReviewsHandler);

export { doctorsRouter };
