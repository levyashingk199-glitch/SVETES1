import React from 'react';
import { INCIDENT_TYPES, INCIDENT_STATUSES } from '../../data/incidents';
import { Zap, Droplets, Flame, Clock, CheckCircle2, Users, Layers } from 'lucide-react';

export default function StatsBanner({ incidents, onSelectTypeFilter, activeTypeFilter }) {
  const plannedCount = incidents.filter(i => i.status === INCIDENT_STATUSES.PLANNED).length;
  const electricityCount = incidents.filter(i => i.type === INCIDENT_TYPES.ELECTRICITY && i.status !== INCIDENT_STATUSES.RESOLVED).length;
  const waterCount = incidents.filter(i => i.type === INCIDENT_TYPES.WATER && i.status !== INCIDENT_STATUSES.RESOLVED).length;
  const gasCount = incidents.filter(i => i.type === INCIDENT_TYPES.GAS && i.status !== INCIDENT_STATUSES.RESOLVED).length;
  const resolvedCount = incidents.filter(i => i.status === INCIDENT_STATUSES.RESOLVED).length;
  const totalConfirmations = incidents.reduce((sum, item) => sum + (item.reportsCount || 1), 0);

  return (
    <div className="svetanet-stats-bar">
      <div
        className={`stat-pill ${activeTypeFilter === 'all' ? 'active' : ''}`}
        onClick={() => onSelectTypeFilter('all')}
        title="Показать все коммунальные точки Ташкента"
      >
        <Layers size={14} className="pill-ico" />
        <span className="pill-title">Все события:</span>
        <span className="pill-value">{incidents.length}</span>
      </div>

      <div
        className={`stat-pill pill-electricity ${activeTypeFilter === INCIDENT_TYPES.ELECTRICITY ? 'active' : ''}`}
        onClick={() => onSelectTypeFilter(INCIDENT_TYPES.ELECTRICITY)}
        title="Фильтр: отключения электроэнергии (свет)"
      >
        <Zap size={14} className="pill-ico text-amber" />
        <span className="pill-title">Нет света:</span>
        <span className="pill-value text-amber">{electricityCount}</span>
      </div>

      <div
        className={`stat-pill pill-water ${activeTypeFilter === INCIDENT_TYPES.WATER ? 'active' : ''}`}
        onClick={() => onSelectTypeFilter(INCIDENT_TYPES.WATER)}
        title="Фильтр: отключения водоснабжения"
      >
        <Droplets size={14} className="pill-ico text-blue" />
        <span className="pill-title">Нет воды:</span>
        <span className="pill-value text-blue">{waterCount}</span>
      </div>

      <div
        className={`stat-pill pill-gas ${activeTypeFilter === INCIDENT_TYPES.GAS ? 'active' : ''}`}
        onClick={() => onSelectTypeFilter(INCIDENT_TYPES.GAS)}
        title="Фильтр: отключения природного газа"
      >
        <Flame size={14} className="pill-ico text-gas" />
        <span className="pill-title">Нет газа:</span>
        <span className="pill-value text-gas">{gasCount}</span>
      </div>

      <div
        className={`stat-pill pill-planned ${activeTypeFilter === 'planned' ? 'active' : ''}`}
        onClick={() => onSelectTypeFilter('planned')}
        title="Предстоящие плановые ремонты сетей"
      >
        <Clock size={14} className="pill-ico text-purple" />
        <span className="pill-title">Скоро работы:</span>
        <span className="pill-value text-purple">{plannedCount}</span>
      </div>

      <div className="stat-pill pill-community" title="Всего подтверждений проблем от жителей Ташкента">
        <Users size={14} className="pill-ico text-blue" />
        <span className="pill-title">Откликов жителей:</span>
        <span className="pill-value">{totalConfirmations}</span>
      </div>

      <div className="stat-pill pill-resolved" title="Успешно устраненные аварии">
        <CheckCircle2 size={14} className="pill-ico text-green" />
        <span className="pill-title">Восстановлено:</span>
        <span className="pill-value text-green">{resolvedCount}</span>
      </div>
    </div>
  );
}
