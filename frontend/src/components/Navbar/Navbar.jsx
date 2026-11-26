import React from 'react';
import { PlusCircle, Menu, X, LogIn, LogOut, Shield, Building2, User, RefreshCw } from 'lucide-react';

export default function Navbar({
  onOpenReportModal,
  onOpenAuthModal,
  onOpenAdminModal,
  user,
  isAdmin,
  onLogout,
  isApiOnline,
  isApiChecking,
  apiError,
  onOpenCabinetModal,
  onRefreshApi,
  isSidebarOpen,
  onToggleSidebar,
}) {
  const isOrg = isAdmin || user?.role === 'organization';

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
            <span className="logo-emoji">⚡</span>
          </div>
          <div className="brand-info">
            <div className="brand-name">
              WarnTech <span className="brand-tag">Ташкент</span>
            </div>
            <div className="brand-desc">Мониторинг аварий и плановых отключений (SvetaNet)</div>
          </div>
        </div>

        {/* API Status Indicator */}
        <div
          data-nosnippet
          className={`api-status-badge ${isApiOnline ? 'api-online' : isApiChecking ? 'api-checking' : 'api-offline'}`}
          title={isApiOnline ? 'Подключено к backend API' : isApiChecking ? 'Подключение к серверу…' : `Нет связи с сервером: ${apiError || 'проверьте подключение'}`}
          onClick={onRefreshApi}
        >
          <span className="api-dot"></span>
          <span className="api-text">
            {isApiOnline ? 'API Онлайн' : isApiChecking ? 'Подключение…' : 'Нет связи'}
          </span>
          <RefreshCw size={12} className="api-refresh-icon" />
        </div>
      </div>

      <div className="header-right">
        {/* Hotlines bar */}
        <div className="hotlines-bar">
          <span className="hotline-item">РЭС: <strong>1154</strong></span>
          <span className="hotline-sep">•</span>
          <span className="hotline-item">ГорГаз: <strong>104</strong></span>
          <span className="hotline-sep">•</span>
          <span className="hotline-item">Сув: <strong>1055</strong></span>
        </div>

        {/* Admin Panel Button - ONLY APPEARS WHEN ADMIN LOGS IN */}
        {isAdmin && (
          <button
            className="btn-admin-panel"
            onClick={onOpenAdminModal}
            title="Административная панель: мониторинг точек, скорые работы, процесс"
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
              onClick={isOrg ? onOpenCabinetModal : undefined}
              title={isAdmin ? 'Открыть кабинет администратора' : isOrg ? 'Открыть кабинет службы' : 'Профиль пользователя'}
            >
              {isAdmin ? (
                <Shield size={14} className="text-red" />
              ) : isOrg ? (
                <Building2 size={14} className="text-blue" />
              ) : (
                <User size={14} />
              )}
              <span className="user-email-text">{user.email}</span>
              <span className="user-role-badge">
                {isAdmin ? 'Админ' : isOrg ? 'Служба' : 'Житель'}
              </span>
            </button>
            <button className="user-logout-btn" onClick={onLogout} title="Выйти из аккаунта">
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button className="btn-auth-login" onClick={onOpenAuthModal}>
            <LogIn size={15} />
            <span>Вход</span>
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
