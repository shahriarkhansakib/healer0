import { Hono } from 'hono';
import { requireAuth, requireActiveAccount } from '../../infra/middleware';
import type { AuthVariables } from '../../infra/middleware/auth';
import { MessagesController } from './messages.controller';

const messagesRouter = new Hono<{ Variables: AuthVariables }>();

messagesRouter.use('*', requireAuth, requireActiveAccount);

messagesRouter.get('/conversations', MessagesController.listConversations);
messagesRouter.get('/unread-count', MessagesController.getUnreadCount);
messagesRouter.get('/thread/:otherUserId', MessagesController.getThread);
messagesRouter.post('/send', MessagesController.send);

export { messagesRouter };
