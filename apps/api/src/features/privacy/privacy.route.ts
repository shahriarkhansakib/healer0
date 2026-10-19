import { Hono } from 'hono';
import { requireAuth, requireActiveAccount, requireProfile } from '../../infra/middleware';
import { PrivacyController } from './privacy.controller';

const privacyRouter = new Hono();

privacyRouter.use('*', requireAuth, requireActiveAccount, requireProfile('patient'));

privacyRouter.get('/consents', PrivacyController.listConsents);
privacyRouter.put('/consents', PrivacyController.upsertConsent);
privacyRouter.post('/consents/provision', PrivacyController.provisionDefaults);

export { privacyRouter };
