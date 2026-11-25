import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { INCIDENT_TYPES, INCIDENT_STATUSES } from '../../data/incidents';
import { MapPin, X } from 'lucide-react';

// Tashkent Center coordinates
export const TASHKENT_CENTER = [41.3111, 69.2797];

// --- Helpers: точка может прийти в разных форматах (локальная / с бэкенда) ---
const getId = (inc) => inc?.id || inc?._id;

// Возвращает [lat, lng] или null
const getCoords = (inc) => {
  if (!inc) return null;
  const ok = (a) => Array.isArray(a) && a.length === 2 && a.every((n) => Number.isFinite(Number(n)));
  if (ok(inc.coordinates)) return [Number(inc.coordinates[0]), Number(inc.coordinates[1])];
  const lc = inc.location?.coordinates; // backend GeoJSON: [lng, lat]
  if (ok(lc)) return [Number(lc[1]), Number(lc[0])];
  if (Number.isFinite(Number(inc.lat)) && Number.isFinite(Number(inc.lng)) && inc.lat !== null && inc.lng !== null) {
    return [Number(inc.lat), Number(inc.lng)];
  }
  return null;
};

// ISO-дату с бэкенда показываем читаемо, обычные строки не трогаем
const fmtTime = (v) => {
  if (!v) return '—';
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d)) {
      return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    }
  }
  return s;
};

// Clean SvetaNet-inspired civic markers (no AI purple/neon)
const createMarkerIcon = (type, status, reportsCount = 0, isSelected = false) => {
  let bgColor = '#d97706'; // Amber for electricity
  let glyph = '⚡';
  let typeLabel = 'Свет';

  if (type === INCIDENT_TYPES.WATER) {
    bgColor = '#0284c7'; // Sky / River blue for water
    glyph = '💧';
    typeLabel = 'Вода';
  } else if (type === INCIDENT_TYPES.GAS) {
    bgColor = '#ea580c'; // Terracotta orange for gas
    glyph = '🔥';
    typeLabel = 'Газ';
  }

  const isResolved = status === INCIDENT_STATUSES.RESOLVED;
  const isPlanned = status === INCIDENT_STATUSES.PLANNED;

  let pinBg = bgColor;
  if (isResolved) {
    pinBg = '#16a34a'; // Civic soft green
  }

  if (isPlanned) {
    glyph = '⏳';
    typeLabel = 'План';
  }

  const html = `
    <div class="svetanet-marker ${isSelected ? 'marker-selected' : ''} ${isResolved ? 'is-resolved' : ''} ${isPlanned ? 'is-planned' : ''}">
      <div class="marker-bubble" style="background-color: ${pinBg};">
        <span class="marker-glyph">${glyph}</span>
        ${reportsCount > 0 ? `<span class="marker-badge">${reportsCount}</span>` : ''}
        ${isPlanned ? `<span class="marker-badge-plan">Скоро</span>` : ''}
      </div>
      <div class="marker-arrow" style="border-top-color: ${pinBg};"></div>
      <div class="marker-caption ${isPlanned ? 'caption-planned' : ''}">${isPlanned ? 'Скоро работы' : typeLabel}</div>
    </div>
  `;

  return L.divIcon({
    html: html,
    className: 'svetanet-div-icon',
    iconSize: [40, 52],
    iconAnchor: [20, 50],
    popupAnchor: [0, -48],
  });
};

export default function IncidentMap({
  incidents,
  selectedIncident,
  onSelectIncident,
  onOpenDetails,
  selectedDistrict,
  user,
  isAdmin,
  onDeletePoint,
  onOpenAdminWithPoint,
  isSelectingLocation,
  onLocationSelected,
  onCancelSelectingLocation,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const circlesLayerRef = useRef(null);
  const markerMapRef = useRef(new Map());
  const tempMarkerRef = useRef(null);

  // Initialize Tashkent Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: TASHKENT_CENTER,
      zoom: 12,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Standard OpenStreetMap tiles (clean civic style)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap | WarnTech Ташкент',
      maxZoom: 19,
    }).addTo(map);

    const circlesLayer = L.layerGroup().addTo(map);
    const markersLayer = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    circlesLayerRef.current = circlesLayer;
    markersLayerRef.current = markersLayer;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Location Selection Mode
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (isSelectingLocation) {
      map.getContainer().style.cursor = 'crosshair';

      const handleMapClick = (e) => {
        const { lat, lng } = e.latlng;

        if (tempMarkerRef.current) {
          tempMarkerRef.current.remove();
        }

        const tempIcon = L.divIcon({
          html: `<div class="temp-picker-pin"><div class="pin-ring"></div>📍</div>`,
          className: 'temp-pin-wrapper',
          iconSize: [32, 32],
          iconAnchor: [16, 28],
        });

        tempMarkerRef.current = L.marker([lat, lng], { icon: tempIcon }).addTo(map);
        onLocationSelected({ lat, lng });
      };

      map.on('click', handleMapClick);

      return () => {
        map.off('click', handleMapClick);
        map.getContainer().style.cursor = '';
      };
    } else {
      map.getContainer().style.cursor = '';
      if (tempMarkerRef.current) {
        tempMarkerRef.current.remove();
        tempMarkerRef.current = null;
      }
    }
  }, [isSelectingLocation, onLocationSelected]);

  // Sync Markers and Outage Circles
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    const circlesLayer = circlesLayerRef.current;

    if (!map || !markersLayer || !circlesLayer) return;

    markersLayer.clearLayers();
    circlesLayer.clearLayers();
    markerMapRef.current.clear();

    incidents.forEach((inc) => {
      // Одна «битая» точка не должна ломать отрисовку остальных
      try {
        const incId = getId(inc);
        const coords = getCoords(inc);
        if (!coords) {
          console.warn('Точка без координат, не показана на карте:', inc);
          return;
        }

        const isSelected = selectedIncident && getId(selectedIncident) === incId;
        const reports = inc.reportsCount ?? inc.confirmations ?? 0;
        const icon = createMarkerIcon(inc.type, inc.status, reports, isSelected);

        const marker = L.marker(coords, { icon });

        // Outage area circle (warm natural civic colors)
        let circleColor = '#d97706';
        if (inc.type === INCIDENT_TYPES.WATER) circleColor = '#0284c7';
        if (inc.type === INCIDENT_TYPES.GAS) circleColor = '#ea580c';
        if (inc.status === INCIDENT_STATUSES.RESOLVED) circleColor = '#16a34a';

        const isPlanned = inc.status === INCIDENT_STATUSES.PLANNED;
        const isResolved = inc.status === INCIDENT_STATUSES.RESOLVED;
        const isInProgress = inc.status === INCIDENT_STATUSES.IN_PROGRESS;

        const circle = L.circle(coords, {
          radius: inc.impactRadius || 250,
          color: circleColor,
          weight: isSelected ? 2.5 : 1.5,
          opacity: isSelected ? 0.85 : 0.45,
          fillColor: circleColor,
          fillOpacity: isSelected ? 0.18 : 0.08,
          dashArray: isPlanned ? '5, 5' : isResolved ? '4, 4' : undefined,
        });
        circlesLayer.addLayer(circle);

        // Clean SvetaNet popup content
        const statusText = isPlanned
          ? '<span class="status-pill pill-planned">⏳ Скоро работы</span>'
          : isResolved
          ? '<span class="status-pill pill-green">Восстановлено</span>'
          : isInProgress
          ? '<span class="status-pill pill-amber">Идут работы</span>'
          : '<span class="status-pill pill-red">Отключено</span>';

        const reportsHtml = reports
          ? `<div class="popup-reports">👥 <strong>${reports}</strong> подтверждений жителей</div>`
          : '';

        const progress = typeof inc.progress === 'number'
          ? inc.progress
          : isPlanned
          ? 15
          : isResolved
          ? 100
          : 50;

        const progressHtml = `
          <div class="popup-progress-block">
            <div class="popup-progress-label">
              <span>Прогресс: <strong>${progress}%</strong></span>
              <span class="popup-stage-tag">${inc.processStage || (isPlanned ? 'Подготовка' : 'В работе')}</span>
            </div>
            <div class="popup-progress-bar">
              <div class="popup-progress-fill fill-${inc.status}" style="width: ${progress}%"></div>
            </div>
          </div>
        `;

        const adminActionsHtml = isAdmin
          ? `
            <div class="popup-admin-controls">
              <button class="popup-admin-btn btn-edit-proc" id="popup-admin-edit-${incId}">
                ⚙️ Изменить процесс
              </button>
              <button class="popup-admin-btn btn-del-point" id="popup-admin-del-${incId}">
                🗑 Удалить точку
              </button>
            </div>
          `
          : '';

        const reportedStr = fmtTime(inc.reportedAt || inc.createdAt);
        const resolutionStr = fmtTime(inc.estimatedResolution);

        const timeRowHtml = isPlanned
          ? `
            <div class="popup-time-row">
              <div>Начало работ: <strong>${fmtTime(inc.plannedStart) !== '—' ? fmtTime(inc.plannedStart) : reportedStr}</strong></div>
              <div>Ориентир завершения: <strong>${resolutionStr}</strong></div>
            </div>
          `
          : `
            <div class="popup-time-row">
              <div>Отключено: <strong>${reportedStr.split(' ')[1] || reportedStr}</strong></div>
              <div>Ориентир включения: <strong>${resolutionStr.split(' ')[1] || resolutionStr}</strong></div>
            </div>
          `;

        const popupHtml = `
          <div class="svetanet-popup ${isPlanned ? 'popup-is-planned' : ''}">
            <div class="popup-top">
              <span class="popup-district">${inc.district || ''} р-н</span>
              ${statusText}
            </div>
            <h4 class="popup-title">${inc.title || 'Без названия'}</h4>
            <div class="popup-mahalla">📍 ${inc.mahalla || inc.district || ''}</div>
            <div class="popup-address">${inc.address || ''}</div>
            ${reportsHtml}
            ${progressHtml}
            ${timeRowHtml}
            <button class="popup-action-btn" id="popup-btn-${incId}">
              Подробнее и контакты службы →
            </button>
            ${adminActionsHtml}
          </div>
        `;

        marker.bindPopup(popupHtml, {
          className: 'svetanet-leaflet-popup',
          maxWidth: 340,
          minWidth: 270,
        });

        marker.on('click', () => {
          onSelectIncident(inc);
        });

        marker.on('popupopen', () => {
          const btn = document.getElementById(`popup-btn-${incId}`);
          if (btn) {
            btn.onclick = () => {
              onOpenDetails(inc);
            };
          }

          if (isAdmin) {
            const editBtn = document.getElementById(`popup-admin-edit-${incId}`);
            if (editBtn) {
              editBtn.onclick = () => {
                if (onOpenAdminWithPoint) onOpenAdminWithPoint(inc);
              };
            }

            const delBtn = document.getElementById(`popup-admin-del-${incId}`);
            if (delBtn) {
              delBtn.onclick = () => {
                if (window.confirm(`Удалить точку "${inc.title || 'без названия'}" с карты?`)) {
                  if (onDeletePoint) onDeletePoint(incId);
                }
              };
            }
          }
        });

        markersLayer.addLayer(marker);
        markerMapRef.current.set(incId, marker);
      } catch (err) {
        console.error('Не удалось отрисовать точку на карте:', inc, err);
      }
    });
  }, [incidents, selectedIncident, onSelectIncident, onOpenDetails, isAdmin, onDeletePoint, onOpenAdminWithPoint]);

  // Center on selected incident
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedIncident) return;

    const coords = getCoords(selectedIncident);
    if (!coords) return;

    const marker = markerMapRef.current.get(getId(selectedIncident));
    map.flyTo(coords, 15, {
      animate: true,
      duration: 0.8,
    });

    if (marker) {
      setTimeout(() => {
        marker.openPopup();
      }, 300);
    }
  }, [selectedIncident]);

  return (
    <div className={`map-wrapper ${isSelectingLocation ? 'mode-selecting-location' : ''}`}>
      <div ref={mapContainerRef} className="leaflet-map-element" />

      {/* Clean Civic Location Picker Toast */}
      {isSelectingLocation && (
        <div className="location-picker-toast">
          <div className="toast-content">
            <span className="toast-icon">📍</span>
            <div>
              <strong>Выбор точки на карте</strong>
              <p>Кликните в любом месте карты Ташкента, чтобы зафиксировать координаты.</p>
            </div>
          </div>
          <button className="btn-cancel-pick" onClick={onCancelSelectingLocation}>
            <X size={15} />
            <span>Отмена</span>
          </button>
        </div>
      )}

      {/* Clean Civic Map Legend */}
      <div className="svetanet-map-legend">
        <div className="legend-head">Обозначения на карте</div>
        <div className="legend-row">
          <span className="dot dot-planned">⏳</span>
          <span>Скоро работы (Плановые)</span>
        </div>
        <div className="legend-row">
          <span className="dot dot-electricity">⚡</span>
          <span>Свет (электричество)</span>
        </div>
        <div className="legend-row">
          <span className="dot dot-water">💧</span>
          <span>Вода (холодная/ГВС)</span>
        </div>
        <div className="legend-row">
          <span className="dot dot-gas">🔥</span>
          <span>Газ (природный)</span>
        </div>
        <div className="legend-row">
          <span className="dot dot-resolved">✅</span>
          <span>Восстановлено / Завершено</span>
        </div>
      </div>
    </div>
  );
}