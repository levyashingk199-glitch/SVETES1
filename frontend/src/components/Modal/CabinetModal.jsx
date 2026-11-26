import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Shield,
  Download,
  Users,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Clock,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { api } from '../../api';

export default function CabinetModal({ isOpen, onClose, user, onStatusChangeSuccess }) {
  const [activeTab, setActiveTab] = useState('org_dashboard'); // 'org_dashboard', 'org_outages', 'admin_stats', 'admin_users', 'admin_orgs'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Data states
  const [dashboardData, setDashboardData] = useState(null);
  const [orgOutages, setOrgOutages] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminOrgs, setAdminOrgs] = useState([]);

  const isAdmin = user?.role === 'admin';
  const isOrg = isAdmin || user?.role === 'organization';

  useEffect(() => {
    if (isOpen) {
      if (isAdmin && activeTab === 'org_dashboard') {
        loadData('org_dashboard');
      } else if (isOrg) {
        loadData('org_dashboard');
      }
    }
  }, [isOpen, activeTab]);

  const loadData = async (tab) => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'org_dashboard') {
        const res = await api.getOrgDashboard();
        setDashboardData(res);
      } else if (tab === 'org_outages') {
        const res = await api.getOrgOutages();
        setOrgOutages(res);
      } else if (tab === 'admin_stats') {
        const res = await api.getAdminStats();
        setAdminStats(res);
      } else if (tab === 'admin_users') {
        const res = await api.getAdminUsers();
        setAdminUsers(res);
      } else if (tab === 'admin_orgs') {
        const res = await api.getAdminOrganizations();
        setAdminOrgs(res);
      }
    } catch (err) {
      console.warn(`Error loading tab ${tab}:`, err);
      setError(`Не удалось загрузить данные: ${err.message}`);
      if (tab === 'org_dashboard') setDashboardData(null);
      if (tab === 'org_outages') setOrgOutages([]);
      if (tab === 'admin_stats') setAdminStats(null);
      if (tab === 'admin_users') setAdminUsers([]);
      if (tab === 'admin_orgs') setAdminOrgs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      await api.exportOrgCsv();
    } catch (err) {
      alert(`Ошибка экспорта CSV: ${err.message}. Проверьте соединение с http://localhost:4000`);
    }
  };

  const handleStatusUpdate = async (outageId, newStatus) => {
    try {
      const updated = await api.updateOutageStatus(outageId, newStatus);
      onStatusChangeSuccess(updated);
      setOrgOutages((prev) =>
        prev.map((o) => (o.id === outageId || o._id === outageId ? { ...o, status: newStatus } : o))
      );
    } catch (err) {
      alert(`Ошибка смены статуса (PATCH /api/outages/${outageId}/status): ${err.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="svetanet-modal cabinet-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <div className="cabinet-user-badge">
            {isAdmin ? <Shield size={18} className="text-red" /> : <Building2 size={18} className="text-blue" />}
            <div>
              <div className="modal-category">
                {isAdmin ? 'Административная панель' : 'Личный кабинет службы'}
              </div>
              <h3 className="modal-heading">
                {user?.email} <span className="role-tag">({user?.role || (isAdmin ? 'admin' : 'org')})</span>
              </h3>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Закрыть">
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="cabinet-tabs-bar">
          <button
            className={`cab-tab ${activeTab === 'org_dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('org_dashboard')}
          >
            📊 Дашборд службы
          </button>

          <button
            className={`cab-tab ${activeTab === 'org_outages' ? 'active' : ''}`}
            onClick={() => setActiveTab('org_outages')}
          >
            📋 Заявки службы
          </button>

          {isAdmin && (
            <>
              <button
                className={`cab-tab ${activeTab === 'admin_stats' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin_stats')}
              >
                📈 Системная статистика
              </button>
              <button
                className={`cab-tab ${activeTab === 'admin_users' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin_users')}
              >
                👥 Пользователи
              </button>
              <button
                className={`cab-tab ${activeTab === 'admin_orgs' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin_orgs')}
              >
                🏢 Организации
              </button>
            </>
          )}

          <button className="cab-tab-export" onClick={handleExportCsv} title="Скачать CSV">
            <Download size={14} />
            <span>Экспорт CSV</span>
          </button>
        </div>

        {/* Content body */}
        <div className="modal-scroll-body cabinet-body">
          {error && (
            <div className="cab-notice">
              <AlertTriangle size={15} />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="cab-loading">
              <RefreshCw size={24} className="spin-icon" />
              <span>Загрузка данных из API...</span>
            </div>
          ) : (
            <>
              {/* Tab 1: Organization Dashboard */}
              {activeTab === 'org_dashboard' && dashboardData && (
                <div className="cab-section">
                  <div className="cab-stat-cards-grid">
                    <div className="cab-kpi-card">
                      <span className="kpi-title">Активные аварии</span>
                      <span className="kpi-val text-red">{dashboardData.activeCount ?? 0}</span>
                      <span className="kpi-sub">требуют устранения</span>
                    </div>
                    <div className="cab-kpi-card">
                      <span className="kpi-title">В процессе ремонта</span>
                      <span className="kpi-val text-amber">{dashboardData.inProgressCount ?? 0}</span>
                      <span className="kpi-sub">бригады на выезде</span>
                    </div>
                    <div className="cab-kpi-card">
                      <span className="kpi-title">Ликвидировано сегодня</span>
                      <span className="kpi-val text-green">{dashboardData.resolvedToday ?? 0}</span>
                      <span className="kpi-sub">подача восстановлена</span>
                    </div>
                    <div className="cab-kpi-card">
                      <span className="kpi-title">Охват жителей</span>
                      <span className="kpi-val">{(dashboardData.affectedResidentsTotal ?? 0).toLocaleString('ru-RU')}</span>
                      <span className="kpi-sub">в зоне ответственности</span>
                    </div>
                  </div>

                  <div className="cab-quick-actions">
                    <button className="btn-action-primary" onClick={handleExportCsv}>
                      <FileSpreadsheet size={16} />
                      <span>Выгрузить отчет в CSV (/api/organizations/export/csv)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: Organization Outages */}
              {activeTab === 'org_outages' && (
                <div className="cab-section">
                  <div className="section-head-row">
                    <h4>Список подведомственных отключений</h4>
                    <span className="counter-tag">{orgOutages.length} инцидентов</span>
                  </div>

                  <div className="cab-outages-table-wrap">
                    <table className="cab-table">
                      <thead>
                        <tr>
                          <th>Тип / Адрес</th>
                          <th>Район / Махалля</th>
                          <th>Статус</th>
                          <th>Действие (PATCH status)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orgOutages.map((item) => (
                          <tr key={item._id || item.id}>
                            <td>
                              <strong>{item.title}</strong>
                              <div className="cell-sub">{item.address}</div>
                            </td>
                            <td>
                              <div>{item.district}</div>
                              <div className="cell-sub">{item.mahalla}</div>
                            </td>
                            <td>
                              <span className={`status-badge-inline status-${item.status}`}>
                                {item.status === 'active'
                                  ? 'Отключено'
                                  : item.status === 'in_progress'
                                  ? 'В работе'
                                  : 'Восстановлено'}
                              </span>
                            </td>
                            <td>
                              <select
                                className="status-change-select"
                                value={item.status}
                                onChange={(e) => handleStatusUpdate(item._id || item.id, e.target.value)}
                              >
                                <option value="active">Отключено</option>
                                <option value="in_progress">В работе</option>
                                <option value="resolved">Восстановлено</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 3: Admin Stats */}
              {activeTab === 'admin_stats' && adminStats && (
                <div className="cab-section">
                  <div className="cab-stat-cards-grid">
                    <div className="cab-kpi-card">
                      <span className="kpi-title">Всего пользователей</span>
                      <span className="kpi-val">{adminStats.users ?? 0}</span>
                    </div>
                    <div className="cab-kpi-card">
                      <span className="kpi-title">Организаций ЖКХ</span>
                      <span className="kpi-val">{adminStats.organizations ?? 0}</span>
                    </div>
                    <div className="cab-kpi-card">
                      <span className="kpi-title">Сообщений от граждан</span>
                      <span className="kpi-val text-blue">{adminStats.total ?? 0}</span>
                    </div>
                    <div className="cab-kpi-card">
                      <span className="kpi-title">Аптайм платформы</span>
                      <span className="kpi-val text-green">{`${Math.floor((adminStats.uptime || 0) / 3600)} ч`}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Admin Users */}
              {activeTab === 'admin_users' && (
                <div className="cab-section">
                  <table className="cab-table">
                    <thead>
                      <tr>
                        <th>Имя / Email</th>
                        <th>Роль в системе</th>
                        <th>ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminUsers.map((u) => (
                        <tr key={u._id || u.id || u.email}>
                          <td>
                            <strong>{u.name || u.email.split('@')[0]}</strong>
                            <div className="cell-sub">{u.email}</div>
                          </td>
                          <td>
                            <span className={`role-pill role-${u.role}`}>{u.role}</span>
                          </td>
                          <td className="cell-id">{u._id || u.id || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 5: Admin Organizations */}
              {activeTab === 'admin_orgs' && (
                <div className="cab-section">
                  <table className="cab-table">
                    <thead>
                      <tr>
                        <th>Служба</th>
                        <th>Email</th>
                        <th>Виды услуг</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminOrgs.map((org) => (
                        <tr key={org._id || org.id || org.name}>
                          <td>
                            <strong>{org.name}</strong>
                          </td>
                          <td>{org.email}</td>
                          <td>{(org.serviceTypes || []).join(', ') || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-bottom">
          <button className="btn-close" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
