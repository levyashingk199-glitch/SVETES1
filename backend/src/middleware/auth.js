import jwt from 'jsonwebtoken';
import { User, Organization } from '../models/index.js';
import { AppError, wrap, TYPES } from '../utils/helpers.js';
const JWT_SECRET = process.env.JWT_SECRET || 'warntech-secret-key-render-prod-fallback';
const load = async req => {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  try { const { id } = jwt.verify(h.slice(7), JWT_SECRET); return await User.findById(id); } catch { return null; }
};
export const protect = wrap(async (req, res, next) => {
  const u = await load(req);
  if (!u) throw new AppError('Требуется авторизация', 401);
  if (u.blocked) throw new AppError('Аккаунт заблокирован', 403);
  req.user = u; next();
});
export const optionalAuth = wrap(async (req, res, next) => { const u = await load(req); if (u && !u.blocked) req.user = u; next(); });
export const role = (...r) => (req, res, next) => r.includes(req.user.role) ? next() : next(new AppError('Недостаточно прав', 403));
// Organization sees only its service types; admin sees everything
export const orgScope = wrap(async (req, res, next) => {
  if (req.user.role === 'admin') { req.types = TYPES; return next(); }
  const org = req.user.organization && await Organization.findById(req.user.organization);
  if (!org) throw new AppError('Организация не назначена. Обратитесь к администратору', 403);
  req.types = org.serviceTypes; next();
});
