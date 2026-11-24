import React, { useState } from 'react';
import { X, CheckCircle2, Send } from 'lucide-react';
import { INCIDENT_TYPES, INCIDENT_STATUSES, TASHKENT_DISTRICTS } from '../../data/incidents';
import { api } from '../../api';

export default function ReportIncidentModal({ isOpen, onClose, onAddIncident }) {
  const [type, setType] = useState(INCIDENT_TYPES.ELECTRICITY);
  const [district, setDistrict] = useState(TASHKENT_DISTRICTS[1]); // 'Юнусабадский'
  const [mahalla, setMahalla] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!address.trim() || !mahalla.trim() || isSubmitting) return;
    setError('');
    setIsSubmitting(true);

    // Offset in Tashkent area
    const offsetLat = (Math.random() - 0.5) * 0.05;
    const offsetLng = (Math.random() - 0.5) * 0.05;
    const coords = [41.3111 + offsetLat, 69.2797 + offsetLng];

    try {
      const savedOutage = await api.createOutage({
        type,
        address: `${district}, ${mahalla}, ${address}`,
        description: description.trim() || `Сообщение об отключении в махалле ${mahalla}.`,
        coordinates: coords,
      });

      const newOutage = {
        ...savedOutage,
        title: `Отключение: ${mahalla} (${type === INCIDENT_TYPES.ELECTRICITY ? 'Свет' : type === INCIDENT_TYPES.WATER ? 'Вода' : 'Газ'})`,
        district,
        mahalla,
      };

      onAddIncident(newOutage);
    setIsSuccess(true);

    setTimeout(() => {
      setIsSuccess(false);
      onClose();
      setMahalla('');
      setAddress('');
      setDescription('');
    }, 1800);
    } catch (requestError) {
      setError(requestError.message || 'Не удалось отправить заявку. Войдите в аккаунт и попробуйте снова.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="svetanet-modal report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <div>
            <div className="modal-category">Общественный мониторинг (SvetaNet)</div>
            <h3 className="modal-heading">Сообщить об отключении в Ташкенте</h3>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Закрыть">
            <X size={20} />
          </button>
        </div>

        {error && <div className="auth-alert error" role="alert">{error}</div>}

        {isSuccess ? (
          <div className="report-success-view">
            <CheckCircle2 size={50} className="text-green" />
            <h4>Спасибо за информацию!</h4>
            <p>Отметка отключения добавлена на карту Ташкента.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="report-form-body">
            {/* Type selector */}
            <div className="form-field">
              <label className="field-label">Что именно отключили? *</label>
              <div className="type-buttons-group">
                <button
                  type="button"
                  className={`choice-btn ${type === INCIDENT_TYPES.ELECTRICITY ? 'active electricity' : ''}`}
                  onClick={() => setType(INCIDENT_TYPES.ELECTRICITY)}
                >
                  ⚡ Свет (Электричество)
                </button>
                <button
                  type="button"
                  className={`choice-btn ${type === INCIDENT_TYPES.WATER ? 'active water' : ''}`}
                  onClick={() => setType(INCIDENT_TYPES.WATER)}
                >
                  💧 Вода (Сув)
                </button>
                <button
                  type="button"
                  className={`choice-btn ${type === INCIDENT_TYPES.GAS ? 'active gas' : ''}`}
                  onClick={() => setType(INCIDENT_TYPES.GAS)}
                >
                  🔥 Газ
                </button>
              </div>
            </div>

            {/* District select */}
            <div className="form-field">
              <label className="field-label">Район Ташкента *</label>
              <select
                className="input-select"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
              >
                {TASHKENT_DISTRICTS.filter(d => d !== 'Все районы').map((d) => (
                  <option key={d} value={d}>
                    {d} район
                  </option>
                ))}
              </select>
            </div>

            {/* Mahalla */}
            <div className="form-field">
              <label className="field-label">Махалля / Массив / Квартал *</label>
              <input
                type="text"
                required
                className="input-text"
                placeholder="Например: махалля Чапаната / Юнусабад 11-й квартал"
                value={mahalla}
                onChange={(e) => setMahalla(e.target.value)}
              />
            </div>

            {/* Address */}
            <div className="form-field">
              <label className="field-label">Улица, дом, ориентир *</label>
              <input
                type="text"
                required
                className="input-text"
                placeholder="ул. Катартал, д. 15, возле супермаркета Korzinka"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="form-field">
              <label className="field-label">Подробности (необязательно)</label>
              <textarea
                className="input-textarea"
                rows="2"
                placeholder="Света нет во всем доме или только в подъезде, есть ли запах газа..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="modal-bottom">
              <button type="button" className="btn-close" onClick={onClose}>
                Отмена
              </button>
              <button type="submit" className="btn-submit" disabled={isSubmitting}>
                <Send size={15} /> {isSubmitting ? 'Отправка...' : 'Отправить на карту'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
