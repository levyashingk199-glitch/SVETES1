import React from 'react';
import { PlusCircle, Menu, X, LogIn, LogOut, Shield, Building2, User, RefreshCw, Zap, Flame, Droplets } from 'lucide-react';

export default function Navbar({
  onOpenReportModal,
  onOpenAuthModal,
  onOpenAdminModal,
  onOpenCabinetModal,
  user,
  isAdmin,
  onLogout,
  isApiOnline,
  onRefreshApi,
  isSidebarOpen,
  onToggleSidebar,
}) {
  const isOrg = isAdmin || user?.role === 'organization' || user?.email === 'org@netsveta.dev';

  return (
    <header className="svetanet-header">
      <div className="header-left">
        <button
          className="mobile-menu-btn"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? 'Закрыть список' : 'Открыть список'}
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className="brand-block">
          <div className="brand-logo">
            <img src="/logo.svg" alt="WarnTech Logo" className="logo-image" />
          </div>
          <div className="brand-info">
            <div className="brand-name">
              WarnTech <span className="brand-tag">Ташкент</span>
            </div>
            <div className="brand-desc">Мониторинг аварий и плановых отключений коммунальных сетей</div>
          </div>
        </div>

        {/* API Status Indicator */}
        <div
          className={`api-status-badge ${isApiOnline ? 'api-online' : 'api-offline'}`}
          title={isApiOnline ? 'Сервер подключен: данные обновляются автоматически' : 'Автономный режим (локальная база)'}
          onClick={onRefreshApi}
        >
          <span className="api-dot"></span>
          <span className="api-text">
            {isApiOnline ? 'Сеть онлайн' : 'Офлайн-режим'}
          </span>
          <RefreshCw size={12} className="api-refresh-icon" />
        </div>
      </div>

      <div className="header-right">
        {/* Hotlines bar with tel: links */}
        <div className="hotlines-bar">
          <span className="hotline-label">Диспетчерские:</span>
          <a href="tel:1154" className="hotline-link" title="Позвонить в РЭС (Электросети)">
            <Zap size={13} className="text-amber" />
            <span>РЭС <strong>1154</strong></span>
          </a>
          <span className="hotline-sep">•</span>
          <a href="tel:104" className="hotline-link" title="Позвонить в ГорГаз">
            <Flame size={13} className="text-gas" />
            <span>Газ <strong>104</strong></span>
          </a>
          <span className="hotline-sep">•</span>
          <a href="tel:1055" className="hotline-link" title="Позвонить в Сув таъминоти">
            <Droplets size={13} className="text-blue" />
            <span>Вода <strong>1055</strong></span>
          </a>
        </div>

        {/* Admin Panel Button - ONLY APPEARS WHEN ADMIN LOGS IN */}
        {isAdmin && (
          <button
            className="btn-admin-panel"
            onClick={onOpenAdminModal}
            title="Административная панель: управление авариями, планирование работ"
          >
            <Shield size={15} />
            <span>Админ-панель</span>
            <span className="admin-status-dot"></span>
          </button>
        )}

        {/* User Auth Section */}
        {user ? (
          <div className="user-profile-controls">
            <button
              className="user-cabinet-btn"
              onClick={onOpenCabinetModal}
              title={isAdmin ? 'Открыть кабинет администратора' : isOrg ? 'Открыть кабинет службы' : 'Открыть профиль пользователя'}
            >
              {isAdmin ? (
                <Shield size={14} className="text-red" />
              ) : isOrg ? (
                <Building2 size={14} className="text-blue" />
              ) : (
                <User size={14} />
              )}
              <span className="user-email-text">{user.name || user.email}</span>
              <span className="user-role-badge">
                {isAdmin ? 'Админ' : isOrg ? 'Служба' : 'Житель'}
              </span>
            </button>
            <button className="user-logout-btn" onClick={onLogout} title="Выйти из аккаунта">
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button className="btn-auth-login" onClick={onOpenAuthModal} title="Вход или регистрация в системе">
            <LogIn size={15} />
            <span>Войти / Регистрация</span>
          </button>
        )}

        <button className="btn-report-outage" onClick={onOpenReportModal}>
          <PlusCircle size={16} />
          <span>Сообщить об отключении</span>
        </button>
      </div>
    </header>
  );
}
