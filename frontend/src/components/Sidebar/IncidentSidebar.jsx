import React, { useState } from 'react';
import { Search, X, MapPin, Clock, Users, ChevronRight, ThumbsUp, Trash2, Sliders, Info, Zap, Droplets, Flame } from 'lucide-react';
import { INCIDENT_TYPES, INCIDENT_STATUSES, TASHKENT_DISTRICTS } from '../../data/incidents';

export default function IncidentSidebar({
  incidents,
  allIncidents,
  selectedIncident,
  onSelectIncident,
  onOpenDetails,
  searchQuery,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  selectedDistrict,
  onSelectDistrict,
  onConfirmOutage,
  onStatusChange,
  user,
  isAdmin,
  onDeletePoint,
  onOpenAdminWithPoint,
  isOpen,
}) {
  const [confirmingId, setConfirmingId] = useState(null);

  const plannedCount = allIncidents.filter((i) => i.status === INCIDENT_STATUSES.PLANNED).length;
  const electricityCount = allIncidents.filter((i) => i.type === INCIDENT_TYPES.ELECTRICITY && i.status !== INCIDENT_STATUSES.RESOLVED).length;
  const waterCount = allIncidents.filter((i) => i.type === INCIDENT_TYPES.WATER && i.status !== INCIDENT_STATUSES.RESOLVED).length;
  const gasCount = allIncidents.filter((i) => i.type === INCIDENT_TYPES.GAS && i.status !== INCIDENT_STATUSES.RESOLVED).length;

  const getStatusBadge = (status) => {
    switch (status) {
      case INCIDENT_STATUSES.PLANNED:
        return <span className="badge badge-planned">⏳ Скоро работы</span>;
      case INCIDENT_STATUSES.ACTIVE:
        return <span className="badge badge-outage">⚡ Авария: Нет подачи</span>;
      case INCIDENT_STATUSES.IN_PROGRESS:
        return <span className="badge badge-work">⚙️ Ведутся работы</span>;
      case INCIDENT_STATUSES.RESOLVED:
        return <span className="badge badge-resolved">✅ Восстановлено</span>;
      default:
        return null;
    }
  };

  const getTypeIcon = (type) => {
    if (type === INCIDENT_TYPES.ELECTRICITY) return <Zap size={15} className="text-amber" />;
    if (type === INCIDENT_TYPES.WATER) return <Droplets size={15} className="text-blue" />;
    if (type === INCIDENT_TYPES.GAS) return <Flame size={15} className="text-gas" />;
    return <Zap size={15} />;
  };

  const handleConfirm = async (e, id) => {
    e.stopPropagation();
    setConfirmingId(id);
    try {
      if (onConfirmOutage) await onConfirmOutage(id);
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <aside className={`svetanet-sidebar ${isOpen ? 'is-open' : ''}`}>
      {/* Top Section with Civic Notice, Search and Filters */}
      <div className="sidebar-top-section">
        <div className="civic-live-notice">
          <Info size={14} className="notice-icon" />
          <span>
            Все аварии и отключения видны каждому. Если у вас тоже отключили услугу — нажмите кнопку <strong>+1</strong>.
          </span>
        </div>

        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Поиск по улице, махалле, кварталу..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-btn" onClick={() => onSearchChange('')} aria-label="Очистить поиск">
              <X size={14} />
            </button>
          )}
        </div>

        {/* District Selector Dropdown */}
        <div className="district-filter-row">
          <label className="district-label">Район города:</label>
          <select
            className="district-select"
            value={selectedDistrict}
            onChange={(e) => onSelectDistrict(e.target.value)}
          >
            {TASHKENT_DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Category Tabs */}
        <div className="category-tabs">
          <button
            className={`tab-btn ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => onFilterTypeChange('all')}
          >
            Все ({allIncidents.length})
          </button>
          <button
            className={`tab-btn tab-electricity ${filterType === INCIDENT_TYPES.ELECTRICITY ? 'active' : ''}`}
            onClick={() => onFilterTypeChange(INCIDENT_TYPES.ELECTRICITY)}
          >
            ⚡ Свет ({electricityCount})
          </button>
          <button
            className={`tab-btn tab-water ${filterType === INCIDENT_TYPES.WATER ? 'active' : ''}`}
            onClick={() => onFilterTypeChange(INCIDENT_TYPES.WATER)}
          >
            💧 Вода ({waterCount})
          </button>
          <button
            className={`tab-btn tab-gas ${filterType === INCIDENT_TYPES.GAS ? 'active' : ''}`}
            onClick={() => onFilterTypeChange(INCIDENT_TYPES.GAS)}
          >
            🔥 Газ ({gasCount})
          </button>
          <button
            className={`tab-btn tab-planned ${filterType === 'planned' ? 'active' : ''}`}
            onClick={() => onFilterTypeChange('planned')}
            title="Точки, где скоро будут проводиться плановые работы"
          >
            ⏳ Скоро ({plannedCount})
          </button>
        </div>
      </div>

      {/* Outage Items List */}
      <div className="outage-list">
        <div className="list-header-info">
          <span>
            Отметок на карте: <strong>{incidents.length}</strong>
          </span>
          {selectedDistrict !== 'Все районы' && (
            <span className="district-tag">{selectedDistrict}</span>
          )}
        </div>

        {incidents.length === 0 ? (
          <div className="empty-state-box">
            <div className="empty-icon">✅</div>
            <h4>В данном секторе аварий не зафиксировано</h4>
            <p>Коммунальные сети работают в штатном режиме или фильтр не дал результатов.</p>
            <button
              className="reset-btn"
              onClick={() => {
                onSearchChange('');
                onFilterTypeChange('all');
                onSelectDistrict('Все районы');
              }}
            >
              Сбросить фильтры
            </button>
          </div>
        ) : (
          incidents.map((inc) => {
            const incId = inc._id || inc.id;
            const isSelected = selectedIncident && (selectedIncident.id === incId || selectedIncident._id === incId);
            const isPlanned = inc.status === INCIDENT_STATUSES.PLANNED;
            const progress = typeof inc.progress === 'number' ? inc.progress : (isPlanned ? 15 : inc.status === 'resolved' ? 100 : 50);

            return (
              <div
                key={incId}
                className={`outage-card type-${inc.type} ${isPlanned ? 'card-planned' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectIncident(inc)}
              >
                <div className="outage-card-top">
                  <div className="mahalla-header">
                    <span className="type-symbol">{getTypeIcon(inc.type)}</span>
                    <span className="mahalla-name">{inc.mahalla || inc.district}</span>
                  </div>
                  {getStatusBadge(inc.status)}
                </div>

                <div className="outage-title">{inc.title}</div>

                <div className="outage-address">
                  <MapPin size={13} className="pin-icon" />
                  <span>{inc.address}</span>
                </div>

                {/* Progress bar in card */}
                <div className="card-progress-box">
                  <div className="card-prog-track">
                    <div
                      className={`card-prog-fill fill-${inc.status}`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div className="card-prog-labels">
                    <span className="prog-text">
                      Процесс: <strong>{progress}%</strong>
                    </span>
                    <span className="prog-stage">{inc.processStage || (isPlanned ? 'Подготовка' : 'Ликвидация аварии')}</span>
                  </div>
                </div>

                {isPlanned ? (
                  <div className="card-planned-time-box">
                    <span className="time-item plan-time">
                      <Clock size={12} /> Начало работ: <strong>{inc.plannedStart || inc.reportedAt}</strong>
                    </span>
                    <span className="time-item est-time">
                      Ориентир завершения: {inc.estimatedResolution}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="card-social-row">
                      <div className="community-reports-badge" title="Количество подтверждений от жителей">
                        <Users size={12} />
                        <span><strong>{inc.reportsCount || 1}</strong> подтвердили проблему</span>
                      </div>

                      {/* Confirm button: available to EVERY citizen without registration */}
                      <button
                        className="btn-confirm-outage"
                        disabled={confirmingId === incId}
                        onClick={(e) => handleConfirm(e, incId)}
                        title="Нажмите, если у вас по этому адресу тоже нет света/воды/газа"
                      >
                        <ThumbsUp size={12} />
                        <span>{confirmingId === incId ? 'Сохранение...' : '+1 У меня тоже нет'}</span>
                      </button>
                    </div>

                    <div className="outage-time-info">
                      <span className="time-item">
                        <Clock size={12} /> Отключено: {inc.reportedAt.split(' ')[1] || inc.reportedAt}
                      </span>
                      <span className="time-item est-time">
                        Ориентир включения: {inc.estimatedResolution.split(' ')[1] || inc.estimatedResolution}
                      </span>
                    </div>
                  </>
                )}

                {/* Admin Quick Action Row */}
                {isAdmin && (
                  <div className="card-admin-row" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="btn-quick-admin-edit"
                      onClick={() => onOpenAdminWithPoint && onOpenAdminWithPoint(inc)}
                    >
                      <Sliders size={13} />
                      <span>Изменить процесс</span>
                    </button>

                    <button
                      type="button"
                      className="btn-quick-admin-del"
                      onClick={() => {
                        if (window.confirm(`Удалить точку "${inc.title}" с карты?`)) {
                          if (onDeletePoint) onDeletePoint(incId);
                        }
                      }}
                      title="Удалить точку"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}

                <div className="outage-card-footer">
                  <span className="service-short">{inc.serviceTeam?.split('(')[0] || 'Аварийная служба'}</span>
                  <button
                    className="details-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDetails(inc);
                    }}
                  >
                    Подробнее <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
