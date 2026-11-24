import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, Send, MapPin, Zap, Droplets, Flame } from 'lucide-react';
import { INCIDENT_TYPES, TASHKENT_DISTRICTS } from '../../data/incidents';
import { api } from '../../api';

const TASHKENT_CENTER = [41.3111, 69.2797];

export default function ReportIncidentModal({ isOpen, onClose, onAddIncident }) {
  const [type, setType] = useState(INCIDENT_TYPES.ELECTRICITY);
  const [district, setDistrict] = useState(TASHKENT_DISTRICTS[1]);
  const [mahalla, setMahalla] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pickedCoords, setPickedCoords] = useState(null);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    // Небольшая задержка, чтобы DOM отрисовался
    const timer = setTimeout(() => {
      if (!mapRef.current || mapInstanceRef.current) return;
      import('leaflet').then((L) => {
        const Lf = L.default || L;
        const map = Lf.map(mapRef.current, {
          center: TASHKENT_CENTER,
          zoom: 12,
          zoomControl: true,
        });
        Lf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap',
          maxZoom: 19,
        }).addTo(map);

        const pinIcon = Lf.divIcon({
          html: `<div style="
            width:32px;height:32px;border-radius:50% 50% 50% 0;
            background:#dc2626;border:3px solid #fff;
            box-shadow:0 2px 8px rgba(0,0,0,0.35);
            transform:rotate(-45deg);
            display:flex;align-items:center;justify-content:center;
          "></div>`,
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });

        map.on('click', (e) => {
          const { lat, lng } = e.latlng;
          setPickedCoords([lat, lng]);
          if (markerRef.current) markerRef.current.remove();
          markerRef.current = Lf.marker([lat, lng], { icon: pinIcon }).addTo(map);
        });

        mapInstanceRef.current = map;
        setTimeout(() => map.invalidateSize(), 100);
      });
    }, 50);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!address.trim() || !mahalla.trim() || isSubmitting) return;
    setError('');
    setIsSubmitting(true);

    const coords = pickedCoords || [
      41.3111 + (Math.random() - 0.5) * 0.05,
      69.2797 + (Math.random() - 0.5) * 0.05,
    ];

    try {
      const savedOutage = await api.createOutage({
        type,
        address: `${district}, ${mahalla}, ${address}`,
        description: description.trim() || `Отключение в махалле ${mahalla}.`,
        coordinates: coords,
      });

      onAddIncident({
        ...savedOutage,
        title: `Отключение: ${mahalla}`,
        district,
        mahalla,
      });

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
        setMahalla('');
        setAddress('');
        setDescription('');
        setPickedCoords(null);
      }, 1800);
    } catch (err) {
      setError(err.message || 'Не удалось отправить заявку. Попробуйте снова.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeConfig = {
    [INCIDENT_TYPES.ELECTRICITY]: { icon: Zap, label: 'Свет / Электричество', color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
    [INCIDENT_TYPES.WATER]:       { icon: Droplets, label: 'Вода (Сув)',         color: '#0284c7', bg: '#e0f2fe', border: '#bae6fd' },
    [INCIDENT_TYPES.GAS]:         { icon: Flame,    label: 'Газ (Газ)',           color: '#ea580c', bg: '#ffedd5', border: '#fed7aa' },
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="report-modal-new" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="rmod-header">
          <div className="rmod-header-left">
            <div className="rmod-icon"><MapPin size={18} color="#0284c7" /></div>
            <div>
              <div className="rmod-label">Мониторинг отключений · Ташкент</div>
              <h3 className="rmod-title">Сообщить об отключении</h3>
            </div>
          </div>
          <button className="rmod-close" onClick={onClose}><X size={18} /></button>
        </div>

        {isSuccess ? (
          <div className="rmod-success">
            <div className="rmod-success-icon"><CheckCircle2 size={48} color="#16a34a" /></div>
            <h4>Заявка принята!</h4>
            <p>Отметка добавлена на карту Ташкента</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rmod-body">

            {/* Type selector */}
            <div className="rmod-section">
              <div className="rmod-section-title">Что отключили?</div>
              <div className="rmod-type-grid">
                {Object.entries(typeConfig).map(([t, cfg]) => {
                  const Icon = cfg.icon;
                  const active = type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      className="rmod-type-btn"
                      onClick={() => setType(t)}
                      style={active ? { background: cfg.bg, borderColor: cfg.color, color: cfg.color } : {}}
                    >
                      <Icon size={20} color={active ? cfg.color : '#64748b'} />
                      <span>{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Map picker */}
            <div className="rmod-section">
              <div className="rmod-section-title">
                Укажите точку на карте
                {pickedCoords && (
                  <span className="rmod-coords-badge">
                    📍 {pickedCoords[0].toFixed(4)}, {pickedCoords[1].toFixed(4)}
                  </span>
                )}
              </div>
              <div className="rmod-map-hint">Нажмите на карту, чтобы поставить метку</div>
              <div ref={mapRef} className="rmod-map" />
            </div>

            {/* Address fields */}
            <div className="rmod-section">
              <div className="rmod-section-title">Местоположение</div>
              <div className="rmod-fields">
                <div className="rmod-field">
                  <label>Район</label>
                  <select value={district} onChange={(e) => setDistrict(e.target.value)}>
                    {TASHKENT_DISTRICTS.filter((d) => d !== 'Все районы').map((d) => (
                      <option key={d} value={d}>{d} район</option>
                    ))}
                  </select>
                </div>
                <div className="rmod-field">
                  <label>Махалля / Массив / Квартал *</label>
                  <input
                    type="text"
                    required
                    placeholder="Юнусабад 11-й квартал"
                    value={mahalla}
                    onChange={(e) => setMahalla(e.target.value)}
                  />
                </div>
                <div className="rmod-field">
                  <label>Улица, дом, ориентир *</label>
                  <input
                    type="text"
                    required
                    placeholder="ул. Катартал, д. 15"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="rmod-field">
                  <label>Подробности (необязательно)</label>
                  <textarea
                    rows="2"
                    placeholder="Нет света во всём доме, есть запах газа..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {error && <div className="rmod-error">{error}</div>}

            <div className="rmod-footer">
              <button type="button" className="rmod-btn-cancel" onClick={onClose}>Отмена</button>
              <button type="submit" className="rmod-btn-submit" disabled={isSubmitting}>
                <Send size={15} />
                {isSubmitting ? 'Отправка...' : 'Отправить на карту'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

