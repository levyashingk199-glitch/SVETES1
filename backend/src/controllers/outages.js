import { Outage, Confirmation } from '../models/index.js';
import { TYPES, STATUSES, AppError, wrap } from '../utils/helpers.js';
import { buildFilter } from '../services/outages.js';
const emit = (req, ev, o) => req.app.get('io').emit(ev, o.toJSON ? o.toJSON() : o);

// Узбекистан: +998 XX XXX XX XX
const UZ_CODES = ['20', '33', '50', '55', '71', '77', '88', '90', '91', '93', '94', '95', '97', '98', '99'];
const normalizePhone = (v) => {
  if (!v) return '';
  const d = String(v).replace(/\D/g, '');
  const n = d.length === 9 ? '998' + d : d;
  if (/^998\d{9}$/.test(n)) {
    return '+' + n;
  }
  return String(v).slice(0, 20);
};

export const create = wrap(async (req, res) => {
  const { type, address, title, district, mahalla, plannedStart, estimatedResolution, progress, processStage, isPlanned } = req.body;
  const description = String(req.body.description || '').trim();
  if (!TYPES.includes(type)) throw new AppError('Выберите тип аварии / службы (электричество, вода или газ)');
  if (description.length < 3 || description.length > 1000) throw new AppError('Описание: от 3 до 1000 символов');
  
  const lat = parseFloat(req.body.lat);
  const lng = parseFloat(req.body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new AppError('Неверные географические координаты');
  }

  const phone = normalizePhone(req.body.phone);

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
    progress: Number(progress) || (status === 'resolved' ? 100 : status === 'in_progress' ? 50 : 20),
    processStage: String(processStage || (isPlanned ? 'Подготовка' : 'Заявка принята в работу')),
    isPlanned: Boolean(isPlanned || status === 'planned'),
    plannedStart: String(plannedStart || ''),
    estimatedResolution: String(estimatedResolution || (status === 'planned' ? 'Согласно графику' : 'Сегодня к 18:30')),
    affectedHouses: Number(req.body.affectedHouses) || 1,
    affectedResidents: Number(req.body.affectedResidents) || 100,
    phone,
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

export const list = wrap(async (req, res) => {
  const docs = await Outage.find(buildFilter(req.query)).sort('-createdAt').limit(500);
  const staff = ['admin', 'organization'].includes(req.user?.role);
  res.json(staff ? docs.map((d) => ({ ...d.toJSON(), phone: d.phone || '' })) : docs);
});

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
  if (req.user && String(o.createdBy) === String(req.user._id)) {
    throw new AppError('Автор заявки уже учтён и не может повторно подтверждать её', 400);
  }
  if (req.user) {
    try {
      await Confirmation.create({ outage: o._id, user: req.user._id });
    } catch (e) {
      if (e.code === 11000) throw new AppError('Вы уже подтвердили эту аварию', 409);
    }
  }
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
  o.status = status;
  await o.save();
  emit(req, 'outage:updated', o);
  if (status === 'resolved') emit(req, 'outage:resolved', o);
  res.json(o);
});
