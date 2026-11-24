
import { Router } from 'express';
import { protect, optionalAuth, role, orgScope } from '../middleware/auth.js';
import * as A from '../controllers/auth.js';
import * as O from '../controllers/outages.js';
import * as G from '../controllers/organizations.js';
import * as D from '../controllers/admin.js';

const r = Router();
const org = [protect, role('organization', 'admin'), orgScope];
const adm = [protect, role('admin')];
const privileged = [protect, role('organization', 'admin')];

r.post('/auth/register', A.register);
r.post('/auth/login', A.login);
r.get('/auth/me', protect, A.me);

r.post('/outages', protect, O.create);
r.get('/outages', O.list);
r.get('/outages/:id', optionalAuth, O.getOne);
r.delete('/outages/:id', protect, O.remove);
r.patch('/outages/:id', ...privileged, O.updateOutage);

r.post('/outages/:id/confirm', protect, O.confirm);
r.patch('/outages/:id/status', ...org, O.setStatus);

r.get('/organizations/dashboard', ...org, G.dashboard);
r.get('/organizations/outages', ...org, G.list);
r.get('/organizations/export/csv', ...org, G.exportCsv);

r.get('/admin/users', ...adm, D.users);
r.patch('/admin/users/:id', ...adm, D.updateUser);
r.get('/admin/organizations', ...adm, D.orgs);
r.post('/admin/organizations', ...adm, D.createOrg);
r.get('/admin/stats', ...adm, D.stats);

export default r;
