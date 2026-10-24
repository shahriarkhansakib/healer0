import { Hono } from 'hono';
import {
  requireAuth,
  requireActiveAccount,
  requireProfile,
  requireRole,
} from '../../infra/middleware';
import { MoodTrackingController } from './mood-tracking.controller';

const moodTrackingRouter = new Hono();

moodTrackingRouter.use('*', requireAuth, requireActiveAccount);

// Wellness rule management is admin-only — patients read the effects, not the rules.
moodTrackingRouter.get('/rules', requireRole('admin'), MoodTrackingController.listRules);
moodTrackingRouter.post('/rules', requireRole('admin'), MoodTrackingController.createRule);

// Patient-scoped mood tracking routes
moodTrackingRouter.post('/', requireProfile('patient'), MoodTrackingController.create);
moodTrackingRouter.get('/', requireProfile('patient'), MoodTrackingController.list);
moodTrackingRouter.get('/summary', requireProfile('patient'), MoodTrackingController.summary);
moodTrackingRouter.get('/:id', requireProfile('patient'), MoodTrackingController.getOne);
moodTrackingRouter.patch('/:id/complete', requireProfile('patient'), MoodTrackingController.completeActivity);
moodTrackingRouter.delete('/:id', requireProfile('patient'), MoodTrackingController.delete);

export { moodTrackingRouter };
