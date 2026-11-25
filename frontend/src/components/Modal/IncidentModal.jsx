import React, { useState } from 'react';
import {
  X,
  MapPin,
  Clock,
  Users,
  Phone,
  CheckCircle2,
  Copy,
  Check,
  Send,
  Shield,
  Trash2,
  Sliders,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { INCIDENT_TYPES, INCIDENT_STATUSES } from '../../data/incidents';

export default function IncidentModal({
  incident,
  onClose,
  onFocusOnMap,
  isAdmin,
  onDeletePoint,
  onUpdateProcess,
}) {
  const [copied, setCopied] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [extraInfo, setExtraInfo] = useState('');

  // Admin inline process edit state
  const [showAdminControls, setShowAdminControls] = useState(false);
  const [statusVal, setStatusVal] = useState(incident?.status || INCIDENT_STATUSES.ACTIVE);
  const [progressVal, setProgressVal] = useState(
    typeof incident?.progress === 'number'
      ? incident.progress
      : incident?.status === 'resolved'
      ? 100
      : incident?.status === 'in_progress'
      ? 50
      : 15
  );
  const [stageVal, setStageVal] = useState(incident?.processStage || '');
  const [adminSaveNotice, setAdminSaveNotice] = useState(null);

  if (!incident) return null;

  const isPlanned = incident.status === INCIDENT_STATUSES.PLANNED;
  const currentProgress = typeof incident.progress === 'number' ? incident.progress : (isPlanned ? 15 : incident.status === 'resolved' ? 100 : 50);

  const handleCopy = () => {
    navigator.clipboard.writeText(`${incident.district}, ${incident.mahalla}, ${incident.address}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendExtra = (e) => {
    e.preventDefault();
    if (!extraInfo.trim()) return;
    setReportSuccess(true);
    setTimeout(() => {
      setExtraInfo('');
      setReportSuccess(false);
    }, 2500);
  };

  const handleSaveProcess = async () => {
    if (!onUpdateProcess) return;
    try {
      await onUpdateProcess(incident.id, {
        status: statusVal,
        progress: Number(progressVal),
        processStage: stageVal,
      });
      setAdminSaveNotice('Процесс успешно обновлен!');
      setTimeout(() => setAdminSaveNotice(null), 3000);
    } catch (err) {
      alert(`Ошибка обновления процесса: ${err.message}`);
    }
  };

  const handleDelete = async () => {
    if (!onDeletePoint) return;
    if (window.confirm(`Удалить точку "${incident.title}" с карты?`)) {
      try {
        await onDeletePoint(incident.id);
        onClose();
      } catch (err) {
        alert(`Ошибка удаления: ${err.message}`);
      }
    }
  };

  const getTypeTitle = (type) => {
    if (type === INCIDENT_TYPES.ELECTRICITY) return '⚡ Электроэнергия (АО «Тошкент шахар электр тармоклари»)';
    if (type === INCIDENT_TYPES.WATER) return '💧 Водоснабжение (ООО «Тошкент шахар сув таъминоти»)';
    if (type === INCIDENT_TYPES.GAS) return '🔥 Природный газ (Филиал «Худудгаз Пойтахт»)';
    return 'Коммунальная служба Ташкента';
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="svetanet-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Top */}
        <div className="modal-top">
          <div>
            <div className="modal-category">{getTypeTitle(incident.type)}</div>
            <h3 className="modal-heading">{incident.title || incident.mahalla}</h3>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Закрыть">
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="modal-scroll-body">
          {/* Status Box */}
          <div className={`status-highlight-box status-${incident.status} ${isPlanned ? 'box-planned' : ''}`}>
            <div className="status-label">
              Текущий статус:{' '}
              <strong>
                {incident.status === INCIDENT_STATUSES.PLANNED
                  ? '⏳ Скоро начнутся плановые ремонтные работы'
                  : incident.status === INCIDENT_STATUSES.ACTIVE
                  ? '⚡ Отключено (аварийная ситуация)'
                  : incident.status === INCIDENT_STATUSES.IN_PROGRESS
                  ? '⚙️ Ведутся восстановительные работы'
                  : '✅ Подача услуги полностью восстановлена'}
              </strong>
            </div>

            {/* Progress Bar inside status box */}
            <div className="modal-progress-wrap">
              <div className="modal-progress-row">
                <span>Прогресс выполнения работ: <strong>{currentProgress}%</strong></span>
                <span className="modal-stage-pill">{incident.processStage || (isPlanned ? 'Подготовка' : 'В работе')}</span>
              </div>
              <div className="modal-bar-track">
                <div
                  className={`modal-bar-fill fill-${incident.status}`}
                  style={{ width: `${currentProgress}%` }}
                ></div>
              </div>
            </div>

            {isPlanned && incident.plannedStart && (
              <div className="planned-start-notice">
                <Clock size={14} />
                <span>Плановое время начала работ: <strong>{incident.plannedStart}</strong></span>
              </div>
            )}

            {incident.reportsCount > 0 && (
              <div className="status-sub">
                👥 От жителей поступило <strong>{incident.reportsCount} сообщений</strong> о проблеме по этому адресу.
              </div>
            )}
          </div>

          {/* Admin Controls Box if admin */}
          {isAdmin && (
            <div className="modal-admin-control-box">
              <div
                className="admin-control-toggle"
                onClick={() => setShowAdminControls((prev) => !prev)}
              >
                <div className="admin-ctrl-left">
                  <Shield size={16} className="text-red" />
                  <strong>Панель Администратора для этой точки</strong>
                </div>
                <span className="toggle-label">{showAdminControls ? 'Свернуть' : 'Изменить процесс / Удалить'}</span>
              </div>

              {adminSaveNotice && (
                <div className="admin-save-toast">
                  <CheckCircle2 size={15} />
                  <span>{adminSaveNotice}</span>
                </div>
              )}

              {showAdminControls && (
                <div className="admin-ctrl-body">
                  <div className="ctrl-group">
                    <label>Изменить статус / процесс:</label>
                    <div className="ctrl-status-buttons">
                      <button
                        type="button"
                        className={`ctrl-btn ${statusVal === INCIDENT_STATUSES.PLANNED ? 'active btn-plan' : ''}`}
                        onClick={() => setStatusVal(INCIDENT_STATUSES.PLANNED)}
                      >
                        ⏳ Скоро работы
                      </button>
                      <button
                        type="button"
                        className={`ctrl-btn ${statusVal === INCIDENT_STATUSES.IN_PROGRESS ? 'active btn-prog' : ''}`}
                        onClick={() => setStatusVal(INCIDENT_STATUSES.IN_PROGRESS)}
                      >
                        ⚙️ В процессе
                      </button>
                      <button
                        type="button"
                        className={`ctrl-btn ${statusVal === INCIDENT_STATUSES.ACTIVE ? 'active btn-act' : ''}`}
                        onClick={() => setStatusVal(INCIDENT_STATUSES.ACTIVE)}
                      >
                        ⚡ Авария
                      </button>
                      <button
                        type="button"
                        className={`ctrl-btn ${statusVal === INCIDENT_STATUSES.RESOLVED ? 'active btn-res' : ''}`}
                        onClick={() => {
                          setStatusVal(INCIDENT_STATUSES.RESOLVED);
                          setProgressVal(100);
                        }}
                      >
                        ✅ Завершено
                      </button>
                    </div>
                  </div>

                  <div className="ctrl-group">
                    <div className="ctrl-label-flex">
                      <label>Прогресс выполнения:</label>
                      <strong>{progressVal}%</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={progressVal}
                      onChange={(e) => setProgressVal(e.target.value)}
                      className="ctrl-slider"
                    />
                  </div>

                  <div className="ctrl-group">
                    <label>Текущий этап процесса / комментарий диспетчера:</label>
                    <input
                      type="text"
                      className="admin-input"
                      value={stageVal}
                      onChange={(e) => setStageVal(e.target.value)}
                      placeholder="например: Монтаж кабеля завершен, проводятся испытания"
                    />
                  </div>

                  <div className="ctrl-actions-row">
                    <button type="button" className="btn-admin-save" onClick={handleSaveProcess}>
                      <CheckCircle2 size={15} />
                      <span>Применить изменения процесса</span>
                    </button>

                    <button type="button" className="btn-admin-delete" onClick={handleDelete}>
                      <Trash2 size={15} />
                      <span>Удалить данную точку</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Address & Landmark */}
          <div className="info-block">
            <div className="info-row">
              <MapPin size={16} className="text-muted" />
              <div>
                <div className="info-primary">{incident.address}</div>
                <div className="info-secondary">{incident.district} район, {incident.mahalla}</div>
              </div>
              <button className="copy-btn" onClick={handleCopy}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Скопировано' : 'Копировать'}</span>
              </button>
            </div>
          </div>

          {/* Time and Households */}
          <div className="stats-row-grid">
            <div className="grid-cell">
              <span className="cell-label">{isPlanned ? 'Плановое начало' : 'Время отключения'}</span>
              <span className="cell-value">{incident.plannedStart || incident.reportedAt}</span>
            </div>
            <div className="grid-cell">
              <span className="cell-label">{isPlanned ? 'Ориентир завершения' : 'Ориентир включения'}</span>
              <span className="cell-value text-amber">{incident.estimatedResolution}</span>
            </div>
            <div className="grid-cell">
              <span className="cell-label">Затронуто домов</span>
              <span className="cell-value">{incident.affectedHouses || 1}</span>
            </div>
            <div className="grid-cell">
              <span className="cell-label">Оценка жителей</span>
              <span className="cell-value">~{incident.affectedResidents || 100} чел.</span>
            </div>
          </div>

          {/* Description */}
          <div className="info-section">
            <div className="section-title">Причина и подробности</div>
            <p className="section-text">{incident.description}</p>
          </div>

          {/* Measures */}
          {incident.measuresTaken && incident.measuresTaken.length > 0 && (
            <div className="info-section">
              <div className="section-title">Принимаемые меры и график</div>
              <ul className="measures-bullet-list">
                {incident.measuresTaken.map((m, idx) => (
                  <li key={idx}>
                    <CheckCircle2 size={15} className="text-green" />
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Service contacts */}
          <div className="service-contacts-card">
            <div>
              <div className="service-label">Ответственная служба:</div>
              <div className="service-title">{incident.serviceTeam}</div>
              <div className="service-phone">
                Диспетчерская служба: <strong>{incident.dispatcherContact}</strong>
              </div>
            </div>
            <a
              href={`tel:${String(incident.dispatcherContact).replace(/[^0-9+]/g, '')}`}
              className="call-btn"
            >
              <Phone size={15} />
              <span>Позвонить</span>
            </a>
          </div>

          {/* Citizen confirmation */}
          {!isPlanned && (
            <div className="feedback-section">
              <div className="section-title">У вас тоже нет света/воды поблизости?</div>
              {reportSuccess ? (
                <div className="success-feedback">
                  Спасибо! Ваша отметка добавлена на карту SvetaNet.
                </div>
              ) : (
                <form onSubmit={handleSendExtra} className="feedback-form">
                  <input
                    type="text"
                    placeholder="Укажите номер дома или соседнюю улицу..."
                    value={extraInfo}
                    onChange={(e) => setExtraInfo(e.target.value)}
                    className="feedback-input"
                  />
                  <button type="submit" className="feedback-submit">
                    <Send size={14} /> Подтвердить
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Modal Bottom */}
        <div className="modal-bottom">
          <button
            className="btn-show-map"
            onClick={() => {
              onFocusOnMap(incident);
              onClose();
            }}
          >
            <MapPin size={15} /> Показать на карте
          </button>
          <button className="btn-close" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
