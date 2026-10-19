import { Hono } from 'hono';
import { requireAuth, requireActiveAccount } from '../../infra/middleware';
import { AccountController } from './account.controller';

const accountRouter = new Hono();

accountRouter.use('*', requireAuth, requireActiveAccount);

accountRouter.get('/profile', AccountController.getProfile);
accountRouter.put('/profile', AccountController.updateProfile);

accountRouter.get('/preferences', AccountController.getPreferences);
accountRouter.put('/preferences', AccountController.updatePreferences);

export { accountRouter };
