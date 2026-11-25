import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { protect, optionalAuth, role, orgScope } from '../middleware/auth.js';
import * as A from '../controllers/auth.js';
import * as O from '../controllers/outages.js';
import * as G from '../controllers/organizations.js';
import * as D from '../controllers/admin.js';

// Кулдаун на создание точек: 1 в минуту и не больше 10 в час (админ без лимита)
const keyFn = (req) => (req.user ? String(req.user._id) : (typeof ipKeyGenerator === 'function' ? ipKeyGenerator(req) : req.ip));
const skipAdmin = (req) => ['admin', 'organization'].includes(req.user?.role);
const msg = { message: 'Слишком часто. Подождите минуту перед следующей точкой' };
const createBurst = rateLimit({ windowMs: 60 * 1000, max: 1, keyGenerator: keyFn, skip: skipAdmin, skipFailedRequests: true, requestWasSuccessful: (req, res) => res.statusCode < 400 || res.statusCode === 429, message: msg });
const createHourly = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, keyGenerator: keyFn, skip: skipAdmin, skipFailedRequests: true, requestWasSuccessful: (req, res) => res.statusCode < 400 || res.statusCode === 429, message: msg });

const r = Router(), org = [protect, role('organization', 'admin'), orgScope], adm = [protect, role('admin')], privileged = [protect, role('organization', 'admin')];
r.post('/auth/register', A.register); r.post('/auth/login', A.login); r.get('/auth/me', protect, A.me);
r.post('/outages', optionalAuth, createBurst, createHourly, O.create); r.get('/outages', optionalAuth, O.list); r.get('/outages/:id', optionalAuth, O.getOne);
r.delete('/outages/:id', protect, O.remove);
r.patch('/outages/:id', ...privileged, O.updateOutage);
r.post('/outages/:id/confirm', protect, O.confirm); r.patch('/outages/:id/status', ...org, O.setStatus);
r.get('/organizations/dashboard', ...org, G.dashboard); r.get('/organizations/outages', ...org, G.list); r.get('/organizations/export/csv', ...org, G.exportCsv);
r.get('/admin/users', ...adm, D.users); r.patch('/admin/users/:id', ...adm, D.updateUser);
r.get('/admin/organizations', ...adm, D.orgs); r.post('/admin/organizations', ...adm, D.createOrg); r.get('/admin/stats', ...adm, D.stats);
export default r;
