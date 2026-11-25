import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Organization } from '../models/index.js';
import { AppError, wrap } from '../utils/helpers.js';

const JWT_SECRET = process.env.JWT_SECRET || 'warntech-secret-key-tashkent-2026-production-secured';
const sign = u => jwt.sign({ id: u._id }, JWT_SECRET, { expiresIn: '7d' });
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const register = wrap(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').toLowerCase().trim();
  const password = String(req.body.password || '');
  const requestedRole = req.body.role;
  const role = requestedRole === 'organization' ? 'organization' : 'user';

  if (!name) {
    throw new AppError('Пожалуйста, укажите ваше имя или название службы', 400);
  }
  if (!email || !emailRe.test(email)) {
    throw new AppError('Укажите корректный адрес электронной почты (Email)', 400);
  }
  if (password.length < 6) {
    throw new AppError('Пароль должен содержать не менее 6 символов', 400);
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('Пользователь с таким email уже зарегистрирован. Войдите в аккаунт.', 409);
  }

  let organizationId = null;
  if (role === 'organization') {
    let org = await Organization.findOne();
    if (!org) {
      org = await Organization.create({
        name: name.includes('РЭС') || name.includes('служба') ? name : `Служба: ${name}`,
        email,
        serviceTypes: ['electricity', 'water', 'gas'],
        assignedAreas: ['Ташкент']
      });
    }
    organizationId = org._id;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
    organization: organizationId
  });

  const token = sign(user);
  res.status(201).json({
    success: true,
    message: 'Регистрация успешно завершена',
    token,
    user: {
      _id: user._id,
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      organization: user.organization
    }
  });
});

export const login = wrap(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().trim();
  const password = String(req.body.password || '');

  if (!email || !password) {
    throw new AppError('Укажите email и пароль', 400);
  }

  const user = await User.findOne({ email }).select('+password').populate('organization');
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError('Неверный email или пароль', 401);
  }
  if (user.blocked) {
    throw new AppError('Аккаунт заблокирован администратором', 403);
  }

  const token = sign(user);
  res.json({
    success: true,
    token,
    user: {
      _id: user._id,
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      organization: user.organization
    }
  });
});

export const me = wrap(async (req, res) => {
  const user = await User.findById(req.user._id).populate('organization');
  res.json(user);
});
