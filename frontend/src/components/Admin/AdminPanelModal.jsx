import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Shield,
  PlusCircle,
  Trash2,
  Edit3,
  Sliders,
  MapPin,
  Calendar,
  Clock,  
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Activity,
  Layers,
  FileSpreadsheet,
  LogIn,
  LogOut,
  ChevronRight,
  Zap,
  Droplets,
  Flame,
  ArrowUpDown,
  Check,
  Copy,
  Phone,
} from 'lucide-react';
import { INCIDENT_TYPES, INCIDENT_STATUSES, TASHKENT_DISTRICTS } from '../../data/incidents';
import { api } from '../../api';

// Popular Tashkent landmark coordinates presets for quick point placing
const TASHKENT_PRESETS = [
  { name: 'Юнусабад (Mega Planet, 13-й квартал)', lat: 41.3643, lng: 69.2872, district: 'Юнусабадский' },
  { name: 'Юнусабад 7-й квартал (Темур махалля)', lat: 41.3480, lng: 69.2550, district: 'Юнусабадский' },
  { name: 'Чиланзар (Катартал, 9-й квартал)', lat: 41.2825, lng: 69.2144, district: 'Чиланзарский' },
  { name: 'Чиланзар (Торговый центр Чиланзар)', lat: 41.2715, lng: 69.2012, district: 'Чиланзарский' },
  { name: 'Мирзо-Улугбек (массив Карасу-4)', lat: 41.3321, lng: 69.3375, district: 'Мирзо-Улугбекский' },
  { name: 'Мирзо-Улугбек (Буюк Ипак Йули)', lat: 41.3280, lng: 69.3150, district: 'Мирзо-Улугбекский' },
  { name: 'Шайхантахур (Чорсу / Лабзак)', lat: 41.3275, lng: 69.2410, district: 'Шайхантахурский' },
  { name: 'Яккасарай (Шота Руставели)', lat: 41.2910, lng: 69.2570, district: 'Яккасарайский' },
  { name: 'Мирабад (Сапёрная / Госпиталка)', lat: 41.2980, lng: 69.2790, district: 'Мирабадский' },
  { name: 'Сергели (Янги Хаёт / Спутник)', lat: 41.2220, lng: 69.2210, district: 'Сергелийский' },
  { name: 'Алмазар (Беруни / Каракамыш)', lat: 41.3510, lng: 69.2180, district: 'Алмазарский' },
];

export default function AdminPanelModal({
  isOpen,
  onClose,
  user,
  onLoginAsAdmin,
  onLogout,
  incidents,
  onAddPoint,
  onDeletePoint,
  onUpdatePointProcess,
  onFocusOnMap,
  onStartPickOnMap,
  pickedCoordinates,
}) {
  // Tabs: 'table_monitor' (Таблица всех точек), 'create_point' (Поставить точку), 'system_stats' (Экспорт/статистика)
  const [activeTab, setActiveTab] = useState('table_monitor');
  const [adminPassInput, setAdminPassInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [actionNotice, setActionNotice] = useState(null);

  // Table Filters & Sorting
  const [tableSearch, setTableSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('Все районы');
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'planned_first', 'progress_asc', 'progress_desc', 'reports'

  // Inline Row Edit State for Process
  const [editingRowId, setEditingRowId] = useState(null);
  const [editStatus, setEditStatus] = useState(INCIDENT_STATUSES.IN_PROGRESS);
  const [editProgress, setEditProgress] = useState(50);
  const [editStage, setEditStage] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Form State: Add Point (Скоро работы)
  const [formType, setFormType] = useState(INCIDENT_TYPES.ELECTRICITY);
  const [formStatus, setFormStatus] = useState(INCIDENT_STATUSES.PLANNED);
  const [formTitle, setFormTitle] = useState('');
  const [formDistrict, setFormDistrict] = useState(TASHKENT_DISTRICTS[1]); // 'Юнусабадский'
  const [formMahalla, setFormMahalla] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLat, setFormLat] = useState('41.3480');
  const [formLng, setFormLng] = useState('69.2550');
  const [formPlannedStart, setFormPlannedStart] = useState('Завтра в 09:00');
  const [formEstimatedResolution, setFormEstimatedResolution] = useState('Завтра в 17:00');
  const [formProgress, setFormProgress] = useState(15);
  const [formProcessStage, setFormProcessStage] = useState('Оповещение жителей и доставка материалов');
  const [formHouses, setFormHouses] = useState(16);
  const [formResidents, setFormResidents] = useState(3800);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.email === 'admin@netsveta.dev';

  // Sync picked coordinates from map
  useEffect(() => {
    if (pickedCoordinates && pickedCoordinates.lat && pickedCoordinates.lng) {
      setFormLat(pickedCoordinates.lat.toFixed(5));
      setFormLng(pickedCoordinates.lng.toFixed(5));
      if (pickedCoordinates.address) {
        setFormAddress(pickedCoordinates.address);
      }
      setActiveTab('create_point');
      showNotice('Координаты точки успешно выбраны на карте!');
    }
  }, [pickedCoordinates]);

  const showNotice = (msg) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    const pass = adminPassInput.trim() || 'admin123';
    if (pass !== 'admin123' && pass !== 'admin') {
      setAuthError('Неверный пароль администратора (по умолчанию: admin123)');
      return;
    }
    try {
      const res = await api.login('admin@netsveta.dev', 'admin123');
      onLoginAsAdmin(res?.user || {
        email: 'admin@netsveta.dev',
        role: 'admin',
        name: 'Главный Администратор Ташкента',
      });
      setAuthError('');
      showNotice('Успешный вход в режим администратора!');
    } catch (err) {
      if (err.status === 0) {
        onLoginAsAdmin({
          email: 'admin@netsveta.dev',
          role: 'admin',
          name: 'Главный Администратор Ташкента',
        });
        setAuthError('');
        showNotice('Вход выполнен в автономном режиме (сервер недоступен)');
      } else {
        setAuthError(err.message || 'Ошибка авторизации на сервере');
      }
    }
  };

  const handleQuickPresetSelect = (preset) => {
    setFormLat(preset.lat.toString());
    setFormLng(preset.lng.toString());
    setFormDistrict(preset.district);
    setFormAddress(preset.name);
    if (!formTitle) {
      setFormTitle(`Плановые работы: ${preset.district} (${preset.name})`);
    }
  };

  const handleCreatePointSubmit = async (e) => {
    e.preventDefault();
    if (!formDescription.trim()) {
      alert('Пожалуйста, укажите описание планируемых работ');
      return;
    }

    const lat = parseFloat(formLat);
    const lng = parseFloat(formLng);
    if (isNaN(lat) || isNaN(lng)) {
      alert('Укажите корректные координаты');
      return;
    }

    setFormSubmitting(true);
    try {
      const isPlanned = formStatus === INCIDENT_STATUSES.PLANNED;
      const newPointData = {
        title: formTitle.trim() || `${isPlanned ? 'Плановые работы' : 'Аварийное отключение'}: ${formMahalla || formDistrict}`,
        type: formType,
        status: formStatus,
        district: formDistrict,
        mahalla: formMahalla.trim() || `махалля ${formDistrict}`,
        address: formAddress.trim() || `${formDistrict}, ориентир уточняется`,
        description: formDescription.trim(),
        coordinates: [lat, lng],
        isPlanned,
        plannedStart: formPlannedStart.trim(),
        estimatedResolution: formEstimatedResolution.trim(),
        progress: Number(formProgress),
        processStage: formProcessStage.trim(),
        affectedHouses: Number(formHouses) || 1,
        affectedResidents: Number(formResidents) || 100,
        severity: isPlanned ? 'medium' : 'high',
        reportedAt: new Date().toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }),
        impactRadius: 300,
        reportsCount: 0,
      };

      await onAddPoint(newPointData);
      showNotice('✅ Точка успешно поставлена на карту!');
      setFormTitle('');
      setFormDescription('');
      setActiveTab('table_monitor');
    } catch (err) {
      alert(`Ошибка добавления точки: ${err.message}`);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleStartEditRow = (pt) => {
    if (editingRowId === pt.id) {
      setEditingRowId(null);
    } else {
      setEditingRowId(pt.id);
      setEditStatus(pt.status);
      setEditProgress(typeof pt.progress === 'number' ? pt.progress : 50);
      setEditStage(pt.processStage || '');
    }
  };

  const handleSaveProcess = async (ptId) => {
    try {
      await onUpdatePointProcess(ptId, {
        status: editStatus,
        progress: Number(editProgress),
        processStage: editStage,
      });
      setEditingRowId(null);
      showNotice('✅ Процесс выполнения точки обновлен!');
    } catch (err) {
      alert(`Ошибка изменения процесса: ${err.message}`);
    }
  };

  const handleDirectStatusChange = async (ptId, newStatus) => {
    try {
      const newProg = newStatus === INCIDENT_STATUSES.RESOLVED ? 100 : newStatus === INCIDENT_STATUSES.IN_PROGRESS ? 50 : 15;
      await onUpdatePointProcess(ptId, {
        status: newStatus,
        progress: newProg,
      });
      showNotice(`Статус точки изменен на «${newStatus === 'planned' ? 'Скоро работы' : newStatus === 'in_progress' ? 'В процессе' : newStatus === 'resolved' ? 'Завершено' : 'Авария'}»`);
    } catch (err) {
      alert(`Ошибка изменения статуса: ${err.message}`);
    }
  };

  const handleDelete = async (ptId, ptTitle) => {
    if (window.confirm(`Вы действительно хотите удалить точку "${ptTitle || ptId}" с карты?`)) {
      try {
        await onDeletePoint(ptId);
        showNotice('🗑 Точка успешно удалена с карты и из базы данных!');
      } catch (err) {
        alert(`Ошибка удаления точки: ${err.message}`);
      }
    }
  };

  const handleCopyCoords = (coords, id) => {
    if (coords && coords.length >= 2) {
      navigator.clipboard.writeText(`${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    }
  };

  // Filtered & Sorted Points for Monitoring Table
  const filteredAndSortedPoints = useMemo(() => {
    let result = incidents.filter((pt) => {
      // Status Filter
      if (statusFilter !== 'all' && pt.status !== statusFilter) return false;

      // Type Filter
      if (typeFilter !== 'all' && pt.type !== typeFilter) return false;

      // District Filter
      if (districtFilter !== 'Все районы' && pt.district !== districtFilter) return false;

      // Search Query
      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase().trim();
        const matchAddr = pt.address?.toLowerCase().includes(q);
        const matchTitle = pt.title?.toLowerCase().includes(q);
        const matchDist = pt.district?.toLowerCase().includes(q);
        const matchMah = pt.mahalla?.toLowerCase().includes(q);
        const matchDesc = pt.description?.toLowerCase().includes(q);
        if (!matchAddr && !matchTitle && !matchDist && !matchMah && !matchDesc) return false;
      }
      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'planned_first') {
        if (a.status === INCIDENT_STATUSES.PLANNED && b.status !== INCIDENT_STATUSES.PLANNED) return -1;
        if (b.status === INCIDENT_STATUSES.PLANNED && a.status !== INCIDENT_STATUSES.PLANNED) return 1;
      } else if (sortBy === 'progress_asc') {
        return (a.progress || 0) - (b.progress || 0);
      } else if (sortBy === 'progress_desc') {
        return (b.progress || 0) - (a.progress || 0);
      } else if (sortBy === 'reports') {
        return (b.reportsCount || 0) - (a.reportsCount || 0);
      }
      return 0; // default order / newest
    });

    return result;
  }, [incidents, statusFilter, typeFilter, districtFilter, tableSearch, sortBy]);

  // Live Counts for Monitoring
  const counts = useMemo(() => {
    return {
      total: incidents.length,
      planned: incidents.filter((i) => i.status === INCIDENT_STATUSES.PLANNED).length,
      inProgress: incidents.filter((i) => i.status === INCIDENT_STATUSES.IN_PROGRESS).length,
      active: incidents.filter((i) => i.status === INCIDENT_STATUSES.ACTIVE).length,
      resolved: incidents.filter((i) => i.status === INCIDENT_STATUSES.RESOLVED).length,
    };
  }, [incidents]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="svetanet-modal admin-panel-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-top admin-header-top">
          <div className="admin-header-title">
            <div className="admin-shield-icon">
              <Shield size={24} className="text-red" />
            </div>
            <div>
              <div className="modal-category">Панель диспетчера и администратора (Ташкент)</div>
              <h3 className="modal-heading">
                Административная панель — Мониторинг всех точек
              </h3>
            </div>
          </div>

          <div className="admin-header-actions">
            {isAdmin && (
              <div className="admin-user-pill">
                <span className="online-indicator"></span>
                <span>{user?.email || 'admin@netsveta.dev'}</span>
                <span className="role-tag">Админ</span>
              </div>
            )}
            <button className="close-btn" onClick={onClose} aria-label="Закрыть">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Action Notice Banner */}
        {actionNotice && (
          <div className="admin-notice-banner">
            <CheckCircle2 size={16} />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* If not logged in as Admin: Access Gate */}
        {!isAdmin ? (
          <div className="admin-access-gate">
            <div className="gate-card">
              <div className="gate-icon-wrap">
                <Shield size={40} className="gate-icon" />
              </div>
              <h4>Доступ к функциям Администратора</h4>
              <p className="gate-desc">
                Для мониторинга точек в таблице, нанесения плановых работ ("Скоро работы"), удаления и изменения процесса выполнения требуется авторизация администратора.
              </p>

              {authError && (
                <div className="gate-error">
                  <AlertTriangle size={15} />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleAdminLogin} className="gate-form">
                <div className="form-group">
                  <label>Пароль администратора:</label>
                  <input
                    type="password"
                    className="admin-input"
                    placeholder="Введите пароль (по умолчанию admin123)"
                    value={adminPassInput}
                    onChange={(e) => setAdminPassInput(e.target.value)}
                  />
                </div>

                <div className="gate-buttons">
                  <button type="submit" className="btn-admin-submit">
                    <LogIn size={16} />
                    <span>Войти с паролем</span>
                  </button>

                  <button
                    type="button"
                    className="btn-quick-admin-login"
                    onClick={() => {
                      onLoginAsAdmin({
                        email: 'admin@netsveta.dev',
                        role: 'admin',
                        name: 'Главный Администратор',
                      });
                      showNotice('Вход как Главный Администратор выполнен успешно!');
                    }}
                  >
                    <Zap size={16} />
                    <span>Быстрый вход: admin@netsveta.dev</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* Authenticated Admin Workspace */
          <div className="admin-workspace">
            {/* Tabs Navigation */}
            <div className="admin-tabs-nav">
              <button
                className={`admin-tab-btn ${activeTab === 'table_monitor' ? 'active' : ''}`}
                onClick={() => setActiveTab('table_monitor')}
              >
                <Layers size={16} />
                <span>📋 Таблица всех точек и мониторинг ({incidents.length})</span>
              </button>

              <button
                className={`admin-tab-btn ${activeTab === 'create_point' ? 'active' : ''}`}
                onClick={() => setActiveTab('create_point')}
              >
                <PlusCircle size={16} />
                <span>📍 Поставить точку (Скоро работы)</span>
              </button>

              <button
                className={`admin-tab-btn ${activeTab === 'system_stats' ? 'active' : ''}`}
                onClick={() => setActiveTab('system_stats')}
              >
                <Activity size={16} />
                <span>📈 Сводка и экспорт</span>
              </button>
            </div>

            {/* TAB 1: Таблица всех точек и мониторинг (Следить за процессом) */}
            {activeTab === 'table_monitor' && (
              <div className="admin-tab-content modal-scroll-body table-tab-body">
                {/* Top Live Counters */}
                <div className="monitoring-kpi-bar">
                  <div className="kpi-mini-card" onClick={() => setStatusFilter('all')}>
                    <span className="kpi-mini-title">Всего на карте:</span>
                    <span className="kpi-mini-num">{counts.total}</span>
                  </div>

                  <div
                    className={`kpi-mini-card kpi-planned ${statusFilter === INCIDENT_STATUSES.PLANNED ? 'active' : ''}`}
                    onClick={() => setStatusFilter(INCIDENT_STATUSES.PLANNED)}
                  >
                    <span className="kpi-mini-title">⏳ Скоро работы:</span>
                    <span className="kpi-mini-num text-amber">{counts.planned}</span>
                  </div>

                  <div
                    className={`kpi-mini-card kpi-amber ${statusFilter === INCIDENT_STATUSES.IN_PROGRESS ? 'active' : ''}`}
                    onClick={() => setStatusFilter(INCIDENT_STATUSES.IN_PROGRESS)}
                  >
                    <span className="kpi-mini-title">⚙️ В процессе:</span>
                    <span className="kpi-mini-num text-amber">{counts.inProgress}</span>
                  </div>

                  <div
                    className={`kpi-mini-card kpi-red ${statusFilter === INCIDENT_STATUSES.ACTIVE ? 'active' : ''}`}
                    onClick={() => setStatusFilter(INCIDENT_STATUSES.ACTIVE)}
                  >
                    <span className="kpi-mini-title">⚡ Аварии:</span>
                    <span className="kpi-mini-num text-red">{counts.active}</span>
                  </div>

                  <div
                    className={`kpi-mini-card kpi-green ${statusFilter === INCIDENT_STATUSES.RESOLVED ? 'active' : ''}`}
                    onClick={() => setStatusFilter(INCIDENT_STATUSES.RESOLVED)}
                  >
                    <span className="kpi-mini-title">✅ Завершено:</span>
                    <span className="kpi-mini-num text-green">{counts.resolved}</span>
                  </div>

                  <button
                    type="button"
                    className="kpi-btn-add-quick"
                    onClick={() => setActiveTab('create_point')}
                  >
                    <PlusCircle size={15} />
                    <span>Поставить точку</span>
                  </button>
                </div>

                {/* Table Filters & Search Bar */}
                <div className="table-controls-bar">
                  <div className="table-search-box">
                    <Search size={15} />
                    <input
                      type="text"
                      placeholder="Поиск по адресу, названию, махалле..."
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                    />
                    {tableSearch && (
                      <button onClick={() => setTableSearch('')} className="clear-icon-btn">
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  <div className="table-select-filters">
                    <select
                      className="table-filter-select"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">Все статусы</option>
                      <option value={INCIDENT_STATUSES.PLANNED}>⏳ Скоро работы</option>
                      <option value={INCIDENT_STATUSES.IN_PROGRESS}>⚙️ В процессе</option>
                      <option value={INCIDENT_STATUSES.ACTIVE}>⚡ Аварии</option>
                      <option value={INCIDENT_STATUSES.RESOLVED}>✅ Завершено</option>
                    </select>

                    <select
                      className="table-filter-select"
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                    >
                      <option value="all">Все службы</option>
                      <option value={INCIDENT_TYPES.ELECTRICITY}>⚡ Свет (РЭС)</option>
                      <option value={INCIDENT_TYPES.WATER}>💧 Вода (Сув)</option>
                      <option value={INCIDENT_TYPES.GAS}>🔥 Газ (ГорГаз)</option>
                    </select>

                    <select
                      className="table-filter-select"
                      value={districtFilter}
                      onChange={(e) => setDistrictFilter(e.target.value)}
                    >
                      {TASHKENT_DISTRICTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>

                    <select
                      className="table-filter-select sort-select"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="newest">Сначала новые</option>
                      <option value="planned_first">Сначала «Скоро работы»</option>
                      <option value="progress_asc">По прогрессу (0% → 100%)</option>
                      <option value="progress_desc">По прогрессу (100% → 0%)</option>
                      <option value="reports">По откликам жителей</option>
                    </select>
                  </div>
                </div>

                {/* The Main Table */}
                {filteredAndSortedPoints.length === 0 ? (
                  <div className="table-empty-box">
                    <div className="empty-ico">📍</div>
                    <h4>Точек пока нет</h4>
                    <p>
                      В системе пока нет активных точек. Точки не создаются автоматически — их наносят диспетчеры и жители.
                    </p>
                    <button
                      type="button"
                      className="btn-create-first-point"
                      onClick={() => setActiveTab('create_point')}
                    >
                      <PlusCircle size={16} />
                      <span>Поставить первую точку («Скоро работы»)</span>
                    </button>
                  </div>
                ) : (
                  <div className="admin-table-container">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          <th style={{ width: '45px' }}>Тип</th>
                          <th style={{ minWidth: '180px' }}>Объект / Адрес</th>
                          <th style={{ width: '130px' }}>Статус точки</th>
                          <th style={{ minWidth: '150px' }}>Процесс (% / Этап)</th>
                          <th style={{ minWidth: '120px' }}>График времени</th>
                          <th style={{ width: '90px' }}>Отклики</th>
                          <th style={{ minWidth: '130px', textAlign: 'right' }}>Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAndSortedPoints.map((pt, idx) => {
                          const isRowEditing = editingRowId === pt.id;
                          const isPlanned = pt.status === INCIDENT_STATUSES.PLANNED;
                          const progress = typeof pt.progress === 'number'
                            ? pt.progress
                            : isPlanned
                            ? 15
                            : pt.status === 'resolved'
                            ? 100
                            : 50;

                          return (
                            <React.Fragment key={pt.id}>
                              <tr
                                className={`table-row-item ${isPlanned ? 'row-planned' : ''} ${isRowEditing ? 'row-editing' : ''}`}
                              >
                                {/* Service Type Icon */}
                                <td className="cell-type">
                                  <span
                                    className={`type-icon-circle type-${pt.type}`}
                                    title={pt.type === INCIDENT_TYPES.ELECTRICITY ? 'Свет (РЭС)' : pt.type === INCIDENT_TYPES.WATER ? 'Вода' : 'Газ'}
                                  >
                                    {pt.type === INCIDENT_TYPES.ELECTRICITY ? '⚡' : pt.type === INCIDENT_TYPES.WATER ? '💧' : '🔥'}
                                  </span>
                                </td>

                                {/* Object Title & Address */}
                                <td className="cell-info">
                                  <div className="table-pt-title">{pt.title}</div>
                                  <div className="table-pt-address">
                                    <MapPin size={12} className="text-muted" />
                                    <span>{pt.district}, {pt.mahalla ? `${pt.mahalla}, ` : ''}{pt.address}</span>
                                  </div>
                                  {pt.phone && (
                                    <a
                                      className="coords-btn"
                                      href={`tel:${pt.phone}`}
                                      title="Позвонить заявителю"
                                    >
                                      <Phone size={11} />
                                      <span>{pt.phone}</span>
                                    </a>
                                  )}
                                  {pt.coordinates && (
                                    <button
                                      type="button"
                                      className="coords-btn"
                                      onClick={() => handleCopyCoords(pt.coordinates, pt.id)}
                                      title="Скопировать координаты"
                                    >
                                      {copiedId === pt.id ? <Check size={11} className="text-green" /> : <Copy size={11} />}
                                      <span>{pt.coordinates[0]?.toFixed(4)}, {pt.coordinates[1]?.toFixed(4)}</span>
                                    </button>
                                  )}
                                </td>

                                {/* Status with inline quick dropdown */}
                                <td className="cell-status">
                                  <select
                                    className={`table-status-select sel-${pt.status}`}
                                    value={pt.status}
                                    onChange={(e) => handleDirectStatusChange(pt.id, e.target.value)}
                                    title="Нажмите, чтобы изменить статус точки"
                                  >
                                    <option value={INCIDENT_STATUSES.PLANNED}>⏳ Скоро работы</option>
                                    <option value={INCIDENT_STATUSES.IN_PROGRESS}>⚙️ В процессе</option>
                                    <option value={INCIDENT_STATUSES.ACTIVE}>⚡ Авария</option>
                                    <option value={INCIDENT_STATUSES.RESOLVED}>✅ Завершено</option>
                                  </select>
                                </td>

                                {/* Progress & Stage */}
                                <td className="cell-progress">
                                  <div className="table-prog-flex">
                                    <span className="table-prog-num"><strong>{progress}%</strong></span>
                                    <span className="table-stage-tag">{pt.processStage || (isPlanned ? 'Подготовка' : 'Ремонт')}</span>
                                  </div>
                                  <div className="table-prog-track">
                                    <div
                                      className={`table-prog-fill fill-${pt.status}`}
                                      style={{ width: `${progress}%` }}
                                    ></div>
                                  </div>
                                </td>

                                {/* Time schedule */}
                                <td className="cell-time">
                                  <div className="table-time-text">
                                    <span className="time-lbl">{isPlanned ? 'Начало:' : 'Создано:'}</span>
                                    <span>{pt.plannedStart || pt.reportedAt}</span>
                                  </div>
                                  <div className="table-time-text est">
                                    <span className="time-lbl">Окончание:</span>
                                    <span>{pt.estimatedResolution}</span>
                                  </div>
                                </td>

                                {/* Citizen confirmations */}
                                <td className="cell-reports">
                                  <span className="reports-chip">
                                    👥 {pt.reportsCount || 0}
                                  </span>
                                </td>

                                {/* Actions */}
                                <td className="cell-actions">
                                  <div className="actions-flex-row">
                                    <button
                                      type="button"
                                      className="btn-tbl-action btn-tbl-map"
                                      onClick={() => {
                                        onFocusOnMap(pt);
                                        onClose();
                                      }}
                                      title="Показать метку на карте Ташкента"
                                    >
                                      <Eye size={13} />
                                    </button>

                                    <button
                                      type="button"
                                      className={`btn-tbl-action btn-tbl-edit ${isRowEditing ? 'active' : ''}`}
                                      onClick={() => handleStartEditRow(pt)}
                                      title="Изменить процесс точки"
                                    >
                                      <Sliders size={13} />
                                      <span>Процесс</span>
                                    </button>

                                    <button
                                      type="button"
                                      className="btn-tbl-action btn-tbl-del"
                                      onClick={() => handleDelete(pt.id, pt.title)}
                                      title="Удалить точку с карты"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>

                              {/* Inline Process Editor when expanded */}
                              {isRowEditing && (
                                <tr className="row-expansion-editor">
                                  <td colSpan={7}>
                                    <div className="inline-editor-card">
                                      <div className="editor-head">
                                        <Sliders size={15} />
                                        <span>Редактирование процесса для точки: <strong>«{pt.title}»</strong></span>
                                      </div>

                                      <div className="editor-fields-row">
                                        {/* Status selector buttons */}
                                        <div className="editor-col">
                                          <label>Статус процесса:</label>
                                          <div className="editor-status-btns">
                                            <button
                                              type="button"
                                              className={`btn-substatus ${editStatus === INCIDENT_STATUSES.PLANNED ? 'active btn-planned' : ''}`}
                                              onClick={() => setEditStatus(INCIDENT_STATUSES.PLANNED)}
                                            >
                                              ⏳ Скоро работы
                                            </button>
                                            <button
                                              type="button"
                                              className={`btn-substatus ${editStatus === INCIDENT_STATUSES.IN_PROGRESS ? 'active btn-progress' : ''}`}
                                              onClick={() => setEditStatus(INCIDENT_STATUSES.IN_PROGRESS)}
                                            >
                                              ⚙️ В процессе
                                            </button>
                                            <button
                                              type="button"
                                              className={`btn-substatus ${editStatus === INCIDENT_STATUSES.RESOLVED ? 'active btn-resolved' : ''}`}
                                              onClick={() => {
                                                setEditStatus(INCIDENT_STATUSES.RESOLVED);
                                                setEditProgress(100);
                                              }}
                                            >
                                              ✅ Завершено (100%)
                                            </button>
                                          </div>
                                        </div>

                                        {/* Progress slider */}
                                        <div className="editor-col">
                                          <div className="editor-lbl-flex">
                                            <label>Прогресс выполнения:</label>
                                            <strong>{editProgress}%</strong>
                                          </div>
                                          <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            step="5"
                                            value={editProgress}
                                            onChange={(e) => setEditProgress(e.target.value)}
                                            className="edit-slider"
                                          />
                                        </div>

                                        {/* Stage notes */}
                                        <div className="editor-col grow">
                                          <label>Текущий этап работ / примечание:</label>
                                          <input
                                            type="text"
                                            className="admin-input"
                                            value={editStage}
                                            onChange={(e) => setEditStage(e.target.value)}
                                            placeholder="например: Демонтаж завершен, сварочные работы"
                                          />
                                        </div>

                                        {/* Save / Cancel */}
                                        <div className="editor-actions">
                                          <button
                                            type="button"
                                            className="btn-save-inline"
                                            onClick={() => handleSaveProcess(pt.id)}
                                          >
                                            <CheckCircle2 size={15} />
                                            <span>Сохранить</span>
                                          </button>
                                          <button
                                            type="button"
                                            className="btn-cancel-inline"
                                            onClick={() => setEditingRowId(null)}
                                          >
                                            Закрыть
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Поставить точку (Скоро работы) */}
            {activeTab === 'create_point' && (
              <div className="admin-tab-content modal-scroll-body">
                <div className="tab-intro-box">
                  <div className="intro-icon">📍</div>
                  <div>
                    <h5>Нанесение точки работ на карту Ташкента</h5>
                    <p>
                      Поставьте точку, где скоро начнутся работы («Скоро работы») или зафиксируйте аварийный участок.
                      Координаты можно выбрать кликом на карте Ташкента или выбрать из быстрых ориентиров районов.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleCreatePointSubmit} className="admin-form-grid">
                  {/* Row 1: Nature & Service Type */}
                  <div className="form-section-card">
                    <h6 className="section-title">1. Характер точки и коммунальная служба</h6>
                    <div className="fields-grid-2">
                      <div className="form-group">
                        <label>Статус точки:</label>
                        <select
                          className="admin-select"
                          value={formStatus}
                          onChange={(e) => setFormStatus(e.target.value)}
                        >
                          <option value={INCIDENT_STATUSES.PLANNED}>⏳ Скоро работы (Плановые работы)</option>
                          <option value={INCIDENT_STATUSES.IN_PROGRESS}>⚙️ В процессе (Идут восстановительные работы)</option>
                          <option value={INCIDENT_STATUSES.ACTIVE}>⚡ Аварийное отключение (Требует бригады)</option>
                          <option value={INCIDENT_STATUSES.RESOLVED}>✅ Завершено (Подача восстановлена)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Тип услуги / служба:</label>
                        <div className="type-radios-row">
                          <label className={`type-chip ${formType === INCIDENT_TYPES.ELECTRICITY ? 'selected type-elec' : ''}`}>
                            <input
                              type="radio"
                              name="serviceType"
                              value={INCIDENT_TYPES.ELECTRICITY}
                              checked={formType === INCIDENT_TYPES.ELECTRICITY}
                              onChange={() => setFormType(INCIDENT_TYPES.ELECTRICITY)}
                            />
                            <span>⚡ Свет (РЭС)</span>
                          </label>

                          <label className={`type-chip ${formType === INCIDENT_TYPES.WATER ? 'selected type-water' : ''}`}>
                            <input
                              type="radio"
                              name="serviceType"
                              value={INCIDENT_TYPES.WATER}
                              checked={formType === INCIDENT_TYPES.WATER}
                              onChange={() => setFormType(INCIDENT_TYPES.WATER)}
                            />
                            <span>💧 Вода (Сув)</span>
                          </label>

                          <label className={`type-chip ${formType === INCIDENT_TYPES.GAS ? 'selected type-gas' : ''}`}>
                            <input
                              type="radio"
                              name="serviceType"
                              value={INCIDENT_TYPES.GAS}
                              checked={formType === INCIDENT_TYPES.GAS}
                              onChange={() => setFormType(INCIDENT_TYPES.GAS)}
                            />
                            <span>🔥 Газ (ГорГаз)</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Location & Map Picker */}
                  <div className="form-section-card">
                    <div className="card-head-flex">
                      <h6 className="section-title">2. Координаты и привязка к карте</h6>
                      <button
                        type="button"
                        className="btn-pick-map"
                        onClick={() => {
                          onStartPickOnMap();
                          onClose();
                        }}
                      >
                        <MapPin size={15} />
                        <span>Кликнуть на карте Ташкента для выбора</span>
                      </button>
                    </div>

                    {/* Quick Presets */}
                    <div className="presets-chips-row">
                      <span className="presets-label">Быстрые ориентиры Ташкента:</span>
                      {TASHKENT_PRESETS.slice(0, 6).map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          className="chip-preset"
                          onClick={() => handleQuickPresetSelect(preset)}
                        >
                          {preset.name.split('(')[0]}
                        </button>
                      ))}
                    </div>

                    <div className="fields-grid-4">
                      <div className="form-group">
                        <label>Широта (Lat):</label>
                        <input
                          type="text"
                          className="admin-input"
                          value={formLat}
                          onChange={(e) => setFormLat(e.target.value)}
                          placeholder="41.3111"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Долгота (Lng):</label>
                        <input
                          type="text"
                          className="admin-input"
                          value={formLng}
                          onChange={(e) => setFormLng(e.target.value)}
                          placeholder="69.2797"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Район Ташкента:</label>
                        <select
                          className="admin-select"
                          value={formDistrict}
                          onChange={(e) => setFormDistrict(e.target.value)}
                        >
                          {TASHKENT_DISTRICTS.filter((d) => d !== 'Все районы').map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Махалля / Квартал:</label>
                        <input
                          type="text"
                          className="admin-input"
                          placeholder="например: махалля «Обиход»"
                          value={formMahalla}
                          onChange={(e) => setFormMahalla(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-group full-width">
                      <label>Точный адрес / ориентир:</label>
                      <input
                        type="text"
                        className="admin-input"
                        placeholder="например: 13-й квартал, ул. Янгишахар, дома 12–24"
                        value={formAddress}
                        onChange={(e) => setFormAddress(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Row 3: Details & Process */}
                  <div className="form-section-card">
                    <h6 className="section-title">3. Описание и график работ</h6>

                    <div className="form-group full-width">
                      <label>Название / Тема работ:</label>
                      <input
                        type="text"
                        className="admin-input"
                        placeholder="например: Плановая замена силового кабеля и профилактика ТП-420"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                      />
                    </div>

                    <div className="form-group full-width">
                      <label>Подробное описание работ:</label>
                      <textarea
                        className="admin-textarea"
                        rows={3}
                        placeholder="Опишите, какие работы будут проводиться, необходимость отключения и меры безопасности..."
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        required
                      />
                    </div>

                    <div className="fields-grid-3">
                      <div className="form-group">
                        <label>Время начала работ:</label>
                        <input
                          type="text"
                          className="admin-input"
                          value={formPlannedStart}
                          onChange={(e) => setFormPlannedStart(e.target.value)}
                          placeholder="Завтра в 09:00"
                        />
                      </div>

                      <div className="form-group">
                        <label>Расчетное время окончания:</label>
                        <input
                          type="text"
                          className="admin-input"
                          value={formEstimatedResolution}
                          onChange={(e) => setFormEstimatedResolution(e.target.value)}
                          placeholder="Завтра в 17:00"
                        />
                      </div>

                      <div className="form-group">
                        <label>Охват (домов / жителей):</label>
                        <div className="inline-dual-inputs">
                          <input
                            type="number"
                            className="admin-input"
                            value={formHouses}
                            onChange={(e) => setFormHouses(e.target.value)}
                            title="Домов"
                            placeholder="Домов"
                          />
                          <input
                            type="number"
                            className="admin-input"
                            value={formResidents}
                            onChange={(e) => setFormResidents(e.target.value)}
                            title="Жителей"
                            placeholder="Жителей"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Progress Slider */}
                    <div className="process-progress-box">
                      <div className="progress-labels-row">
                        <label>Начальный прогресс процесса: <strong>{formProgress}%</strong></label>
                        <span className="progress-status-badge">
                          {formProgress === 0
                            ? '0% — Планирование'
                            : formProgress < 30
                            ? 'Подготовка материалов'
                            : formProgress < 80
                            ? 'Активные ремонтные работы'
                            : 'Завершающие испытания'}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={formProgress}
                        onChange={(e) => setFormProgress(e.target.value)}
                        className="progress-slider"
                      />

                      <div className="form-group" style={{ marginTop: '0.6rem' }}>
                        <label>Текущий этап процесса:</label>
                        <input
                          type="text"
                          className="admin-input"
                          value={formProcessStage}
                          onChange={(e) => setFormProcessStage(e.target.value)}
                          placeholder="например: Оповещение жителей и доставка оборудования"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="form-submit-row">
                    <button type="submit" className="btn-create-submit" disabled={formSubmitting}>
                      <PlusCircle size={18} />
                      <span>{formSubmitting ? 'Сохранение...' : 'Поставить точку на карту Ташкента'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 3: Сводка и экспорт */}
            {activeTab === 'system_stats' && (
              <div className="admin-tab-content modal-scroll-body">
                <div className="admin-stats-grid">
                  <div className="stat-card">
                    <span className="stat-label">Всего реальных точек</span>
                    <span className="stat-number">{incidents.length}</span>
                    <span className="stat-hint">поставлено людьми и админом</span>
                  </div>
                  <div className="stat-card card-planned">
                    <span className="stat-label">⏳ Скоро работы (Плановые)</span>
                    <span className="stat-number text-amber">{counts.planned}</span>
                    <span className="stat-hint">предупреждений жителям</span>
                  </div>
                  <div className="stat-card card-amber">
                    <span className="stat-label">⚙️ В процессе ремонта</span>
                    <span className="stat-number text-amber">{counts.inProgress}</span>
                    <span className="stat-hint">выездные бригады</span>
                  </div>
                  <div className="stat-card card-green">
                    <span className="stat-label">✅ Завершено и восстановлено</span>
                    <span className="stat-number text-green">{counts.resolved}</span>
                    <span className="stat-hint">устраненных участков</span>
                  </div>
                </div>

                <div className="export-action-block">
                  <div className="export-info">
                    <h5>Экспорт сводки всех точек в CSV</h5>
                    <p>Выгрузить полный список всех добавленных точек с их координатами, адресами, статусами и прогрессом выполнения.</p>
                  </div>
                  <button
                    className="btn-export-csv"
                    onClick={() => {
                      if (incidents.length === 0) {
                        alert('Нет данных для выгрузки: список точек пуст.');
                        return;
                      }
                      const headers = 'ID,Тип,Статус,Прогресс,Район,Махалля,Адрес,Начало,Завершение,Откликов,Телефон\n';
                      const rows = incidents
                        .map(
                          (i) =>
                            `"${i.id}","${i.type}","${i.status}","${i.progress || 0}%","${i.district}","${i.mahalla || ''}","${i.address}","${i.plannedStart || ''}","${i.estimatedResolution || ''}","${i.reportsCount || 0}","${i.phone || ''}"`
                        )
                        .join('\n');
                      const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `warntech_tashkent_points_${new Date().toISOString().slice(0, 10)}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                      showNotice('Таблица точек успешно выгружена в CSV!');
                    }}
                  >
                    <FileSpreadsheet size={16} />
                    <span>Скачать таблицу точек (CSV)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
