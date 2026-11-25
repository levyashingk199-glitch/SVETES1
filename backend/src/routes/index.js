import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { protect, optionalAuth, role, orgScope } from '../middleware/auth.js';
import * as A from '../controllers/auth.js';
import * as O from '../controllers/outages.js';
import * as G from '../controllers/organizations.js';
import * as D from '../controllers/admin.js';

// Лимит на создание точек (30 в минуту, чтобы жителям было комфортно сообщать о проблемах)
const keyFn = (req) => (req.user ? String(req.user._id) : req.ip);
const skipAdmin = (req) => ['admin', 'organization'].includes(req.user?.role);
const msg = { message: 'Слишком много запросов. Подождите немного перед следующей отправкой' };
const createBurst = rateLimit({ windowMs: 60 * 1000, max: 30, keyGenerator: keyFn, skip: skipAdmin, skipFailedRequests: true, validate: false, message: msg });
const createHourly = rateLimit({ windowMs: 60 * 60 * 1000, max: 150, keyGenerator: keyFn, skip: skipAdmin, skipFailedRequests: true, validate: false, message: msg });

const r = Router();
const org = [protect, role('organization', 'admin'), orgScope];
const adm = [protect, role('admin')];
const privileged = [protect, role('organization', 'admin')];

// Авторизация и регистрация
r.post('/auth/register', A.register);
r.post('/auth/login', A.login);
r.get('/auth/me', protect, A.me);

// Отключения и аварии (публичный просмотр и добавление для всех граждан)
r.post('/outages', optionalAuth, createBurst, createHourly, O.create);
r.get('/outages', optionalAuth, O.list);
r.get('/outages/:id', optionalAuth, O.getOne);
r.delete('/outages/:id', protect, O.remove);
r.patch('/outages/:id', ...privileged, O.updateOutage);

// Подтверждение "+1" доступно всем гражданам (optionalAuth), чтобы другие видели отклики
r.post('/outages/:id/confirm', optionalAuth, O.confirm);
r.patch('/outages/:id/status', ...org, O.setStatus);

// Кабинет организаций ЖКХ
r.get('/organizations/dashboard', ...org, G.dashboard);
r.get('/organizations/outages', ...org, G.list);
r.get('/organizations/export/csv', ...org, G.exportCsv);

// Администрирование
r.get('/admin/users', ...adm, D.users);
r.patch('/admin/users/:id', ...adm, D.updateUser);
r.get('/admin/organizations', ...adm, D.orgs);
r.post('/admin/organizations', ...adm, D.createOrg);
r.get('/admin/stats', ...adm, D.stats);

export default r;
