import { Hono } from 'hono';
import {
  requireAuth,
  requireActiveAccount,
  requireProfile,
  requireRole,
} from '../../infra/middleware';
import { MoodTrackingController } from './mood-tracking.controller';

const moodTrackingRouter = new Hono();

// All mood-tracking routes require an authenticated, active user with a patient profile.
moodTrackingRouter.use('*', requireAuth, requireActiveAccount, requireProfile('patient'));

moodTrackingRouter.post('/', MoodTrackingController.create);
moodTrackingRouter.get('/', MoodTrackingController.list);
moodTrackingRouter.get('/summary', MoodTrackingController.summary);
moodTrackingRouter.get('/:id', MoodTrackingController.getOne);
moodTrackingRouter.patch('/:id/complete', MoodTrackingController.completeActivity);

// Wellness rule management is admin-only — patients read the effects, not the rules.
moodTrackingRouter.get('/rules', requireRole('admin'), MoodTrackingController.listRules);
moodTrackingRouter.post('/rules', requireRole('admin'), MoodTrackingController.createRule);

export { moodTrackingRouter };
