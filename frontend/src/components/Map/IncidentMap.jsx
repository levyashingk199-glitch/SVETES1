import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { INCIDENT_TYPES, INCIDENT_STATUSES } from '../../data/incidents';
import { MapPin, X } from 'lucide-react';

// Tashkent Center coordinates
export const TASHKENT_CENTER = [41.3111, 69.2797];

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
      const isSelected = selectedIncident && (selectedIncident.id === inc.id || selectedIncident._id === inc.id);
      const icon = createMarkerIcon(inc.type, inc.status, inc.reportsCount, isSelected);

      const marker = L.marker(inc.coordinates, { icon });

      // Outage area circle (warm natural civic colors)
      let circleColor = '#d97706';
      if (inc.type === INCIDENT_TYPES.WATER) circleColor = '#0284c7';
      if (inc.type === INCIDENT_TYPES.GAS) circleColor = '#ea580c';
      if (inc.status === INCIDENT_STATUSES.RESOLVED) circleColor = '#16a34a';

      const isPlanned = inc.status === INCIDENT_STATUSES.PLANNED;

      const circle = L.circle(inc.coordinates, {
        radius: inc.impactRadius || 250,
        color: circleColor,
        weight: isSelected ? 2.5 : 1.5,
        opacity: isSelected ? 0.85 : 0.45,
        fillColor: circleColor,
        fillOpacity: isSelected ? 0.18 : 0.08,
        dashArray: isPlanned ? '5, 5' : inc.status === INCIDENT_STATUSES.RESOLVED ? '4, 4' : undefined,
      });
      circlesLayer.addLayer(circle);

      // Clean SvetaNet popup content
      const statusText = isPlanned
        ? '<span class="status-pill pill-planned">⏳ Скоро работы</span>'
        : inc.status === INCIDENT_STATUSES.ACTIVE
        ? '<span class="status-pill pill-red">Отключено</span>'
        : inc.status === INCIDENT_STATUSES.IN_PROGRESS
        ? '<span class="status-pill pill-amber">Идут работы</span>'
        : '<span class="status-pill pill-green">Восстановлено</span>';

      const reportsHtml = inc.reportsCount
        ? `<div class="popup-reports">👥 <strong>${inc.reportsCount}</strong> подтверждений жителей</div>`
        : '';

      const progress = typeof inc.progress === 'number'
        ? inc.progress
        : isPlanned
        ? 15
        : inc.status === 'resolved'
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
            <button class="popup-admin-btn btn-edit-proc" id="popup-admin-edit-${inc.id}">
              ⚙️ Изменить процесс
            </button>
            <button class="popup-admin-btn btn-del-point" id="popup-admin-del-${inc.id}">
              🗑 Удалить точку
            </button>
          </div>
        `
        : '';

      const timeRowHtml = isPlanned
        ? `
          <div class="popup-time-row">
            <div>Начало работ: <strong>${inc.plannedStart || inc.reportedAt}</strong></div>
            <div>Ориентир завершения: <strong>${inc.estimatedResolution}</strong></div>
          </div>
        `
        : `
          <div class="popup-time-row">
            <div>Отключено: <strong>${inc.reportedAt.split(' ')[1] || inc.reportedAt}</strong></div>
            <div>Ориентир включения: <strong>${inc.estimatedResolution.split(' ')[1] || inc.estimatedResolution}</strong></div>
          </div>
        `;

      const popupHtml = `
        <div class="svetanet-popup ${isPlanned ? 'popup-is-planned' : ''}">
          <div class="popup-top">
            <span class="popup-district">${inc.district} р-н</span>
            ${statusText}
          </div>
          <h4 class="popup-title">${inc.title}</h4>
          <div class="popup-mahalla">📍 ${inc.mahalla || inc.district}</div>
          <div class="popup-address">${inc.address}</div>
          ${reportsHtml}
          ${progressHtml}
          ${timeRowHtml}
          <button class="popup-action-btn" id="popup-btn-${inc.id}">
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
        const btn = document.getElementById(`popup-btn-${inc.id}`);
        if (btn) {
          btn.onclick = () => {
            onOpenDetails(inc);
          };
        }

        if (isAdmin) {
          const editBtn = document.getElementById(`popup-admin-edit-${inc.id}`);
          if (editBtn) {
            editBtn.onclick = () => {
              if (onOpenAdminWithPoint) onOpenAdminWithPoint(inc);
            };
          }

          const delBtn = document.getElementById(`popup-admin-del-${inc.id}`);
          if (delBtn) {
            delBtn.onclick = () => {
              if (window.confirm(`Удалить точку "${inc.title}" с карты?`)) {
                if (onDeletePoint) onDeletePoint(inc.id);
              }
            };
          }
        }
      });

      markersLayer.addLayer(marker);
      markerMapRef.current.set(inc.id, marker);
    });
  }, [incidents, selectedIncident, onSelectIncident, onOpenDetails, isAdmin, onDeletePoint, onOpenAdminWithPoint]);

  // Center on selected incident
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedIncident) return;

    const marker = markerMapRef.current.get(selectedIncident.id);
    map.flyTo(selectedIncident.coordinates, 15, {
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
