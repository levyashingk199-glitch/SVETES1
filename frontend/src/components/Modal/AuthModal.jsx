import React, { useState } from 'react';
import { X, Lock, Mail, User, Shield, Building2, AlertCircle, CheckCircle, UserCheck, ArrowRight } from 'lucide-react';
import { api } from '../../api';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [role, setRole] = useState('user'); // 'user' | 'organization'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen) return null;

  const handleQuickLogin = (demoEmail, demoPass = 'password123') => {
    setMode('login');
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    setSuccessMsg(null);
  };

  const passwordsMatch = !confirmPassword || password === confirmPassword;
  const isFormValid = mode === 'login'
    ? Boolean(email && password)
    : Boolean(name.trim() && email && password.length >= 6 && password === confirmPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (mode === 'register') {
      if (password.length < 6) {
        setError('Пароль должен быть не менее 6 символов');
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Введенные пароли не совпадают');
        setLoading(false);
        return;
      }
    }

    try {
      if (mode === 'login') {
        const { token, user } = await api.login(email.trim().toLowerCase(), password);
        setSuccessMsg(`Добро пожаловать, ${user.name || user.email}! Вход выполнен.`);
        setTimeout(() => {
          onAuthSuccess(user, token);
          onClose();
        }, 700);
      } else {
        const { token, user } = await api.register({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
        });
        setSuccessMsg('Регистрация прошла успешно! Вы автоматически вошли в систему.');
        setTimeout(() => {
          onAuthSuccess(user, token);
          onClose();
        }, 700);
      }
    } catch (err) {
      console.warn('Auth error:', err);
      // Offline fallback: if backend is unreachable, gracefully log in locally for testing
      const msg = err.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || err.status === 0) {
        const fallbackRole = role === 'organization' ? 'organization' : (email.includes('admin') ? 'admin' : 'user');
        const mockUser = {
          email: email.trim().toLowerCase(),
          name: name.trim() || email.split('@')[0],
          role: fallbackRole,
          isOfflineDemo: true,
        };
        api.login(email, password).catch(() => {});
        setSuccessMsg(`Офлайн-режим: выполнен локальный вход (${fallbackRole === 'organization' ? 'Служба ЖКХ' : 'Житель'})`);
        setTimeout(() => {
          onAuthSuccess(mockUser, 'demo-offline-token');
          onClose();
        }, 900);
      } else {
        setError(msg || 'Ошибка авторизации. Проверьте введенные данные.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="svetanet-modal auth-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Top Header */}
        <div className="modal-top">
          <div>
            <div className="modal-category">Единая система коммунального мониторинга</div>
            <h3 className="modal-heading">
              {mode === 'login' ? 'Вход в личный кабинет' : 'Регистрация в WarnTech'}
            </h3>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Закрыть">
            <X size={20} />
          </button>
        </div>

        <div className="modal-scroll-body">
          {/* Main Auth Tabs */}
          <div className="auth-nav-tabs">
            <button
              type="button"
              className={`auth-nav-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccessMsg(null);
              }}
            >
              Вход
            </button>
            <button
              type="button"
              className={`auth-nav-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => {
                setMode('register');
                setError(null);
                setSuccessMsg(null);
              }}
            >
              Регистрация
            </button>
          </div>

          {/* Quick preset credentials only in Login mode */}
          {mode === 'login' && (
            <div className="quick-roles-presets">
              <span className="preset-label">Быстрый вход для проверки ролей:</span>
              <div className="presets-btns">
                <button
                  type="button"
                  className="preset-btn btn-org"
                  onClick={() => handleQuickLogin('org@netsveta.dev')}
                  title="Войти как диспетчер коммунальной службы"
                >
                  <Building2 size={13} />
                  <span>org@netsveta.dev (Служба)</span>
                </button>
                <button
                  type="button"
                  className="preset-btn btn-admin"
                  onClick={() => handleQuickLogin('admin@netsveta.dev')}
                  title="Войти как администратор платформы"
                >
                  <Shield size={13} />
                  <span>admin@netsveta.dev (Админ)</span>
                </button>
              </div>
            </div>
          )}

          {/* Role selector in Register mode */}
          {mode === 'register' && (
            <div className="register-role-picker">
              <label className="field-label">Выберите тип учетной записи:</label>
              <div className="role-options-grid">
                <button
                  type="button"
                  className={`role-option-card ${role === 'user' ? 'selected' : ''}`}
                  onClick={() => setRole('user')}
                >
                  <div className="role-option-header">
                    <User size={18} className="role-icon-user" />
                    <span className="role-option-title">Житель / Гражданин</span>
                  </div>
                  <p className="role-option-desc">
                    Сообщайте об отключениях света, воды, газа и подтверждайте аварии в вашем доме
                  </p>
                </button>

                <button
                  type="button"
                  className={`role-option-card ${role === 'organization' ? 'selected' : ''}`}
                  onClick={() => setRole('organization')}
                >
                  <div className="role-option-header">
                    <Building2 size={18} className="role-icon-org" />
                    <span className="role-option-title">Служба ЖКХ / Диспетчер</span>
                  </div>
                  <p className="role-option-desc">
                    Публикуйте плановые отключения, меняйте статусы работ и управляйте бригадами
                  </p>
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="auth-alert error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="auth-alert success">
              <CheckCircle size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form-styled">
            {mode === 'register' && (
              <div className="form-field">
                <label className="field-label">
                  {role === 'organization' ? 'Название службы / Подразделение *' : 'Ваше имя / ФИО *'}
                </label>
                <div className="input-with-icon">
                  {role === 'organization' ? (
                    <Building2 size={16} className="field-icon" />
                  ) : (
                    <User size={16} className="field-icon" />
                  )}
                  <input
                    type="text"
                    required
                    className="input-text with-icon"
                    placeholder={
                      role === 'organization'
                        ? 'Например: Диспетчер РЭС Юнусабад'
                        : 'Например: Алишер Усманов'
                    }
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="form-field">
              <label className="field-label">Электронная почта (Email) *</label>
              <div className="input-with-icon">
                <Mail size={16} className="field-icon" />
                <input
                  type="email"
                  required
                  className="input-text with-icon"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-field">
              <label className="field-label">
                {mode === 'register' ? 'Придумайте пароль (мин. 6 символов) *' : 'Пароль *'}
              </label>
              <div className="input-with-icon">
                <Lock size={16} className="field-icon" />
                <input
                  type="password"
                  required
                  minLength={mode === 'register' ? 6 : 1}
                  className="input-text with-icon"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {mode === 'register' && (
              <div className="form-field">
                <label className="field-label">Повторите пароль *</label>
                <div className="input-with-icon">
                  <Lock size={16} className="field-icon" />
                  <input
                    type="password"
                    required
                    className={`input-text with-icon ${confirmPassword && !passwordsMatch ? 'input-error' : ''}`}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                {confirmPassword && (
                  <div className={`password-match-hint ${passwordsMatch ? 'valid' : 'invalid'}`}>
                    {passwordsMatch ? (
                      <>
                        <CheckCircle size={13} />
                        <span>Пароли совпадают</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={13} />
                        <span>Пароли не совпадают</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="form-submit-row">
              <button
                type="submit"
                className="btn-auth-primary"
                disabled={loading || (mode === 'register' && !isFormValid)}
              >
                {loading ? (
                  <span>Выполняется запрос...</span>
                ) : mode === 'login' ? (
                  <>
                    <span>Войти в личный кабинет</span>
                    <ArrowRight size={16} />
                  </>
                ) : (
                  <>
                    <span>Создать аккаунт</span>
                    <UserCheck size={16} />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="auth-footer-switch">
            {mode === 'login' ? (
              <p>
                Впервые на платформе?{' '}
                <button
                  type="button"
                  className="switch-link-btn"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                >
                  Зарегистрироваться
                </button>
              </p>
            ) : (
              <p>
                Уже есть аккаунт?{' '}
                <button
                  type="button"
                  className="switch-link-btn"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                >
                  Войти
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
