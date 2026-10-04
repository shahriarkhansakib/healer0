import { Hono } from 'hono';
import { requireAuth, requireActiveAccount, requireProfile } from '../../infra/middleware';
import { JournalsController } from './journals.controller';

const journalsRouter = new Hono();

journalsRouter.use('*', requireAuth, requireActiveAccount, requireProfile('patient'));

journalsRouter.post('/', JournalsController.create);
journalsRouter.get('/', JournalsController.list);
journalsRouter.get('/:id', JournalsController.getOne);
journalsRouter.patch('/:id', JournalsController.update);
journalsRouter.delete('/:id', JournalsController.delete);

export { journalsRouter };
