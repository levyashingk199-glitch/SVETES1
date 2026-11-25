#!/bin/bash
# Запускать из папки backend: bash fix.sh
if [ ! -d src/models ] || [ ! -d src/routes ] || [ ! -d src/controllers ]; then
  echo "ОШИБКА: запусти скрипт из папки backend (где лежит src/)"; exit 1
fi

cat > src/models/index.js <<'EOF_FILE'
import mongoose from 'mongoose';
import { TYPES, STATUSES } from '../utils/helpers.js';
const { Schema } = mongoose;
const J = { toJSON: { virtuals: true, versionKey: false, transform: (d, r) => { delete r.password; return r; } } };

export const Organization = mongoose.model('Organization', new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true },
  serviceTypes: [{ type: String, enum: TYPES }],
  assignedAreas: [String],
}, { timestamps: { createdAt: true, updatedAt: false }, ...J }));

export const User = mongoose.model('User', new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['user', 'organization', 'admin'], default: 'user' },
  blocked: { type: Boolean, default: false },
  organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
}, { timestamps: { createdAt: true, updatedAt: false }, ...J }));

const outageS = new Schema({
  type: { type: String, enum: TYPES, required: true },
  title: { type: String, default: '' },
  description: { type: String, required: true, maxlength: 1000 },
  address: { type: String, maxlength: 250, default: '' },
  district: { type: String, default: 'Юнусабадский' },
  mahalla: { type: String, default: '' },
  location: { type: { type: String, enum: ['Point'], default: 'Point' }, coordinates: { type: [Number], required: true } }, // [lng, lat]
  status: { type: String, enum: STATUSES, default: 'pending' },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  processStage: { type: String, default: '' },
  isPlanned: { type: Boolean, default: false },
  plannedStart: { type: String, default: '' },
  estimatedResolution: { type: String, default: '' },
  affectedHouses: { type: Number, default: 1 },
  affectedResidents: { type: Number, default: 100 },
  confirmations: { type: Number, default: 0 },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: false },
}, { timestamps: true, ...J });
outageS.index({ location: '2dsphere' });
outageS.virtual('lat').get(function () { return this.location.coordinates[1]; });
outageS.virtual('lng').get(function () { return this.location.coordinates[0]; });
export const Outage = mongoose.model('Outage', outageS);

const confS = new Schema({ outage: { type: Schema.Types.ObjectId, ref: 'Outage', required: true }, user: { type: Schema.Types.ObjectId, ref: 'User', required: true } }, { timestamps: true });
confS.index({ outage: 1, user: 1 }, { unique: true });
export const Confirmation = mongoose.model('Confirmation', confS);
EOF_FILE
echo "записан src/models/index.js"

cat > src/routes/index.js <<'EOF_FILE'
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { protect, optionalAuth, role, orgScope } from '../middleware/auth.js';
import * as A from '../controllers/auth.js';
import * as O from '../controllers/outages.js';
import * as G from '../controllers/organizations.js';
import * as D from '../controllers/admin.js';

// Кулдаун на создание точек: 1 в минуту и не больше 10 в час (админ без лимита)
const keyFn = (req) => (req.user ? String(req.user._id) : req.ip);
const skipAdmin = (req) => req.user?.role === 'admin';
const msg = { message: 'Слишком часто. Подождите минуту перед следующей точкой' };
const createBurst = rateLimit({ windowMs: 60 * 1000, max: 1, keyGenerator: keyFn, skip: skipAdmin, message: msg });
const createHourly = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, keyGenerator: keyFn, skip: skipAdmin, message: msg });

const r = Router(), org = [protect, role('organization', 'admin'), orgScope], adm = [protect, role('admin')], privileged = [protect, role('organization', 'admin')];
r.post('/auth/register', A.register); r.post('/auth/login', A.login); r.get('/auth/me', protect, A.me);
r.post('/outages', optionalAuth, createBurst, createHourly, O.create); r.get('/outages', O.list); r.get('/outages/:id', optionalAuth, O.getOne);
r.delete('/outages/:id', protect, O.remove);
r.patch('/outages/:id', ...privileged, O.updateOutage);
r.post('/outages/:id/confirm', protect, O.confirm); r.patch('/outages/:id/status', ...org, O.setStatus);
r.get('/organizations/dashboard', ...org, G.dashboard); r.get('/organizations/outages', ...org, G.list); r.get('/organizations/export/csv', ...org, G.exportCsv);
r.get('/admin/users', ...adm, D.users); r.patch('/admin/users/:id', ...adm, D.updateUser);
r.get('/admin/organizations', ...adm, D.orgs); r.post('/admin/organizations', ...adm, D.createOrg); r.get('/admin/stats', ...adm, D.stats);
export default r;
EOF_FILE
echo "записан src/routes/index.js"

cat > src/controllers/outages.js <<'EOF_FILE'
import { Outage, Confirmation } from '../models/index.js';
import { TYPES, STATUSES, AppError, wrap } from '../utils/helpers.js';
import { buildFilter } from '../services/outages.js';
const emit = (req, ev, o) => req.app.get('io').emit(ev, o.toJSON ? o.toJSON() : o);

export const create = wrap(async (req, res) => {
  const { type, address, title, district, mahalla, plannedStart, estimatedResolution, progress, processStage, isPlanned } = req.body;
  const description = String(req.body.description || '').trim();
  if (!TYPES.includes(type)) throw new AppError('Выберите тип аварии / службы');
  if (description.length < 3 || description.length > 1000) throw new AppError('Описание: от 3 до 1000 символов');
  const lat = parseFloat(req.body.lat), lng = parseFloat(req.body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new AppError('Неверные координаты');

  const status = req.body.status && STATUSES.includes(req.body.status)
    ? req.body.status
    : (isPlanned ? 'planned' : 'pending');

  const o = await Outage.create({
    type,
    title: String(title || (isPlanned ? 'Плановые работы' : 'Аварийное отключение')).slice(0, 200),
    description,
    address: String(address || '').slice(0, 250),
    district: String(district || 'Юнусабадский'),
    mahalla: String(mahalla || ''),
    location: { type: 'Point', coordinates: [lng, lat] },
    status,
    progress: Number(progress) || (status === 'resolved' ? 100 : status === 'in_progress' ? 50 : 0),
    processStage: String(processStage || ''),
    isPlanned: Boolean(isPlanned || status === 'planned'),
    plannedStart: String(plannedStart || ''),
    estimatedResolution: String(estimatedResolution || ''),
    affectedHouses: Number(req.body.affectedHouses) || 1,
    affectedResidents: Number(req.body.affectedResidents) || 100,
    createdBy: req.user?._id || null,
  });
  emit(req, 'outage:created', o);
  res.status(201).json(o);
});

export const remove = wrap(async (req, res) => {
  const o = await Outage.findById(req.params.id);
  if (!o) throw new AppError('Точка не найдена', 404);
  if (req.user.role !== 'admin' && String(o.createdBy) !== String(req.user._id)) {
    throw new AppError('Недостаточно прав для удаления точки', 403);
  }
  await Outage.findByIdAndDelete(o._id);
  await Confirmation.deleteMany({ outage: o._id });
  emit(req, 'outage:deleted', { id: o._id, _id: o._id });
  res.json({ message: 'Точка успешно удалена', id: o._id });
});

export const updateOutage = wrap(async (req, res) => {
  const o = await Outage.findById(req.params.id);
  if (!o) throw new AppError('Точка не найдена', 404);

  const { status, progress, processStage, estimatedResolution, plannedStart, description, address, title, district, mahalla, type } = req.body;
  if (status !== undefined) {
    if (!STATUSES.includes(status)) throw new AppError('Неверный статус');
    o.status = status;
    if (status === 'resolved' && progress === undefined) {
      o.progress = 100;
    }
  }
  if (progress !== undefined) {
    const p = Number(progress);
    if (p >= 0 && p <= 100) o.progress = p;
  }
  if (processStage !== undefined) o.processStage = String(processStage).slice(0, 300);
  if (estimatedResolution !== undefined) o.estimatedResolution = String(estimatedResolution).slice(0, 100);
  if (plannedStart !== undefined) o.plannedStart = String(plannedStart).slice(0, 100);
  if (description !== undefined) o.description = String(description).slice(0, 1000);
  if (address !== undefined) o.address = String(address).slice(0, 250);
  if (title !== undefined) o.title = String(title).slice(0, 200);
  if (district !== undefined) o.district = String(district);
  if (mahalla !== undefined) o.mahalla = String(mahalla);
  if (type !== undefined && TYPES.includes(type)) o.type = type;

  await o.save();
  emit(req, 'outage:updated', o);
  if (o.status === 'resolved') emit(req, 'outage:resolved', o);
  res.json(o);
});

export const list = wrap(async (req, res) => res.json(await Outage.find(buildFilter(req.query)).sort('-createdAt').limit(500)));
export const getOne = wrap(async (req, res) => {
  const o = await Outage.findById(req.params.id);
  if (!o) throw new AppError('Авария не найдена', 404);
  const confirmedByMe = req.user ? !!(await Confirmation.exists({ outage: o._id, user: req.user._id })) : false;
  res.json({ ...o.toJSON(), confirmedByMe });
});
export const confirm = wrap(async (req, res) => {
  const o = await Outage.findById(req.params.id);
  if (!o) throw new AppError('Авария не найдена', 404);
  if (o.status === 'resolved') throw new AppError('Авария уже устранена');
  if (String(o.createdBy) === String(req.user._id)) throw new AppError('Автор заявки уже учтён и не может подтверждать её', 400);
  try { await Confirmation.create({ outage: o._id, user: req.user._id }); } // unique index (outage,user)
  catch (e) { if (e.code === 11000) throw new AppError('Вы уже подтвердили эту аварию', 409); throw e; }
  const upd = await Outage.findByIdAndUpdate(o._id, { $inc: { confirmations: 1 } }, { new: true });
  emit(req, 'outage:confirmed', upd);
  res.json(upd);
});
export const setStatus = wrap(async (req, res) => {
  const { status } = req.body;
  if (!STATUSES.includes(status)) throw new AppError('Неверный статус');
  const o = await Outage.findById(req.params.id);
  if (!o) throw new AppError('Авария не найдена', 404);
  if (!req.types.includes(o.type)) throw new AppError('Эта служба не обслуживает данный тип аварий', 403);
  o.status = status; await o.save();
  emit(req, 'outage:updated', o);
  if (status === 'resolved') emit(req, 'outage:resolved', o);
  res.json(o);
});
EOF_FILE
echo "записан src/controllers/outages.js"

npm install express-rate-limit
echo "ГОТОВО. Теперь: npm run dev"
