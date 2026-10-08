import { Hono } from 'hono';
import {
  requireAuth,
  requireActiveAccount,
  requireProfile,
  requireRole,
} from '../../infra/middleware';
import { EmergencyController } from './emergency.controller';

const emergencyRouter = new Hono();

emergencyRouter.use('*', requireAuth, requireActiveAccount, requireProfile('patient'));

// Crisis events — patients report; admins can view the full platform list for triage.
emergencyRouter.post('/crisis', EmergencyController.reportCrisis);
emergencyRouter.get('/crisis', EmergencyController.listMyCrisisEvents);
emergencyRouter.get('/crisis/all', requireRole('admin'), EmergencyController.listAllCrisisEvents);

// Trusted contacts — fully patient-scoped.
emergencyRouter.post('/contacts', EmergencyController.createTrustedContact);
emergencyRouter.get('/contacts', EmergencyController.listTrustedContacts);
emergencyRouter.delete('/contacts/:id', EmergencyController.deleteTrustedContact);

export { emergencyRouter };
