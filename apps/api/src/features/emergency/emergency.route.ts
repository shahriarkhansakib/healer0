import { Hono } from 'hono';
import {
  requireAuth,
  requireActiveAccount,
  requireProfile,
  requireRole,
} from '../../infra/middleware';
import { EmergencyController } from './emergency.controller';

const emergencyRouter = new Hono();

emergencyRouter.use('*', requireAuth, requireActiveAccount);

// Crisis events — admins can view the full platform list for triage.
emergencyRouter.get('/crisis/all', requireRole('admin'), EmergencyController.listAllCrisisEvents);

// Crisis events — patients report & view personal history
emergencyRouter.post('/crisis', requireProfile('patient'), EmergencyController.reportCrisis);
emergencyRouter.get('/crisis', requireProfile('patient'), EmergencyController.listMyCrisisEvents);

// Trusted contacts — fully patient-scoped.
emergencyRouter.post('/contacts', requireProfile('patient'), EmergencyController.createTrustedContact);
emergencyRouter.get('/contacts', requireProfile('patient'), EmergencyController.listTrustedContacts);
emergencyRouter.delete('/contacts/:id', requireProfile('patient'), EmergencyController.deleteTrustedContact);

export { emergencyRouter };
