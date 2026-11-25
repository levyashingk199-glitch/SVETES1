import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { AppError, wrap } from '../utils/helpers.js';
const JWT_SECRET = process.env.JWT_SECRET || 'warntech-secret-key-render-prod-fallback';
const sign = u => jwt.sign({ id: u._id }, JWT_SECRET, { expiresIn: '7d' });
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const register = wrap(async (req, res) => {
  const name = String(req.body.name || '').trim(), email = String(req.body.email || '').toLowerCase(), password = String(req.body.password || '');
  if (!name || !emailRe.test(email) || password.length < 6) throw new AppError('Проверьте имя, email и пароль (минимум 6 символов)');
  if (await User.exists({ email })) throw new AppError('Этот email уже зарегистрирован', 409);
  const user = await User.create({ name, email, password: await bcrypt.hash(password, 10) }); // role is always "user"
  res.status(201).json({ token: sign(user), user });
});
export const login = wrap(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase(), password = String(req.body.password || '');
  const user = await User.findOne({ email }).select('+password').populate('organization');
  if (!user || !(await bcrypt.compare(password, user.password))) throw new AppError('Неверный email или пароль', 401);
  if (user.blocked) throw new AppError('Аккаунт заблокирован', 403);
  res.json({ token: sign(user), user });
});
export const me = wrap(async (req, res) => res.json(await User.findById(req.user._id).populate('organization')));
