import { Router } from 'express';
import type { Database } from 'better-sqlite3';
import { createServerRouter } from './routes/server';
import { createFarmsRouter } from './routes/farms';
import { createPlayersRouter } from './routes/players';
import { createFieldsRouter } from './routes/fields';
import { createFarmlandsRouter } from './routes/farmlands';
import { createEconomyRouter } from './routes/economy';
import { createMarketRouter } from './routes/market';
import { createTasksRouter } from './routes/tasks';
import { createGoalsRouter } from './routes/goals';
import { createPollerRouter } from './routes/poller';
import { createEventsRouter } from './routes/events';
import { createSettingsRouter } from './routes/settings';

export function createApiRouter(db: Database): Router {
  const router = Router();

  router.use('/server', createServerRouter(db));
  router.use('/farms', createFarmsRouter(db));
  router.use('/players', createPlayersRouter(db));
  router.use('/fields', createFieldsRouter(db));
  router.use('/farmlands', createFarmlandsRouter(db));
  router.use('/economy', createEconomyRouter(db));
  router.use('/market', createMarketRouter(db));
  router.use('/tasks', createTasksRouter(db));
  router.use('/goals', createGoalsRouter(db));
  router.use('/poller', createPollerRouter(db));
  router.use('/events', createEventsRouter());
  router.use('/settings', createSettingsRouter(db));

  return router;
}
