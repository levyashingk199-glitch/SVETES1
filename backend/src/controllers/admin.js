import { User, Organization } from '../models/index.js';
import { AppError, wrap, TYPES } from '../utils/helpers.js';
import { summary } from '../services/outages.js';
export const users = wrap(async (req, res) => res.json(await User.find().populate('organization').sort('-createdAt')));
export const updateUser = wrap(async (req, res) => {
  const { role, blocked, organization } = req.body, u = await User.findById(req.params.id);
  if (!u) throw new AppError('Пользователь не найден', 404);
  if (String(u._id) === String(req.user._id) && (blocked || (role && role !== 'admin'))) throw new AppError('Нельзя заблокировать или понизить себя');
  if (role !== undefined) { if (!['user', 'organization', 'admin'].includes(role)) throw new AppError('Неверная роль'); u.role = role; }
  if (blocked !== undefined) u.blocked = !!blocked;
  if (organization !== undefined) u.organization = organization || undefined;
  await u.save(); res.json(await u.populate('organization'));
});
export const orgs = wrap(async (req, res) => res.json(await Organization.find().sort('-createdAt')));
export const createOrg = wrap(async (req, res) => {
  const { name, email } = req.body, serviceTypes = (req.body.serviceTypes || []).filter(t => TYPES.includes(t));
  if (!name?.trim() || !email?.trim() || !serviceTypes.length) throw new AppError('Укажите название, email и хотя бы одну службу');
  res.status(201).json(await Organization.create({ name: name.trim(), email, serviceTypes }));
});
export const stats = wrap(async (req, res) => res.json({ ...(await summary(TYPES)), users: await User.countDocuments(), organizations: await Organization.countDocuments() }));
