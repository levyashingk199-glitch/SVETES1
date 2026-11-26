import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar/Navbar';
import StatsBanner from './components/Stats/StatsBanner';
import IncidentMap from './components/Map/IncidentMap';
import IncidentSidebar from './components/Sidebar/IncidentSidebar';
import IncidentModal from './components/Modal/IncidentModal';
import ReportIncidentModal from './components/Modal/ReportIncidentModal';
import AdminPanelModal from './components/Admin/AdminPanelModal';
import AuthModal from './components/Modal/AuthModal';
import CabinetModal from './components/Modal/CabinetModal';
import { INCIDENT_TYPES, INCIDENT_STATUSES, TASHKENT_DISTRICTS } from './data/incidents';
import { api, getSavedUser, setSavedUser, getToken } from './api';
import './App.css';
import './responsive.css'; // ВАЖНО: после App.css

const MOBILE_QUERY = '(max-width: 768px)';
const isMobileNow = () =>
  typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches;

export default function App() {
  // Только реальные точки с сервера, без localStorage и моков
  const [incidents, setIncidents] = useState([]);
  const [backendConnected, setBackendConnected] = useState(false);
  const [user, setUser] = useState(() => getSavedUser());

  // Modals state
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCabinetModalOpen, setIsCabinetModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [modalIncident, setModalIncident] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  // На телефоне сайдбар по умолчанию закрыт, чтобы сразу была видна карта
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => !isMobileNow());

  // Map Location Picker State
  const [isSelectingLocation, setIsSelectingLocation] = useState(false);
  const [pickedCoordinates, setPickedCoordinates] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'planned', 'electricity', 'water', 'gas'
  const [selectedDistrict, setSelectedDistrict] = useState(TASHKENT_DISTRICTS[0]); // 'Все районы'

  const isAdmin = user?.role === 'admin' || user?.email === 'admin@netsveta.dev';

  // Гарантируем viewport-тег, чтобы не проверять index.html вручную
  useEffect(() => {
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'viewport';
      document.head.appendChild(meta);
    }
    meta.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
  }, []);

  // При переходе между мобильным и десктопным размером подстраиваем сайдбар
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => setIsSidebarOpen(!e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Загружаем точки ТОЛЬКО с сервера
  const loadOutages = useCallback(async () => {
    try {
      const res = await api.getOutages();
      const items = Array.isArray(res) ? res : (res?.outages || res?.data || res?.items);
      if (Array.isArray(items)) {
        setIncidents(items);
        setBackendConnected(true);
        return;
      }
      console.warn('Неожиданный формат ответа getOutages:', res);
    } catch (error) {
      console.warn('Backend offline:', error.message);
    }
    setBackendConnected(false);
  }, []);

  useEffect(() => {
    loadOutages();

    // Check token if present
    if (getToken()) {
      api.getMe()
        .then((u) => setUser(u))
        .catch(() => {});
    }
  }, [loadOutages]);

  // Filtered incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      // District Filter
      if (selectedDistrict !== 'Все районы' && inc.district !== selectedDistrict) {
        return false;
      }

      // Filter: Planned / Type
      if (filterType === 'planned') {
        if (inc.status !== INCIDENT_STATUSES.PLANNED) return false;
      } else if (filterType !== 'all' && inc.type !== filterType) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesAddress = inc.address?.toLowerCase().includes(q);
        const matchesMahalla = inc.mahalla ? inc.mahalla.toLowerCase().includes(q) : false;
        const matchesTitle = inc.title?.toLowerCase().includes(q);
        const matchesDistrict = inc.district?.toLowerCase().includes(q);

        if (!matchesAddress && !matchesMahalla && !matchesTitle && !matchesDistrict) {
          return false;
        }
      }
      return true;
    });
  }, [incidents, selectedDistrict, filterType, searchQuery]);

  // Выбор точки: на телефоне закрываем список, чтобы показать карту
  const handleSelectIncident = (inc) => {
    setSelectedIncident(inc);
    if (isMobileNow()) setIsSidebarOpen(false);
  };

  // Создание точки: только через сервер, без локальных копий
  const handleAddPoint = async (pointData) => {
    let savedPoint;
    try {
      savedPoint = await api.createOutage(pointData);
    } catch (err) {
      alert(err.message || 'Не удалось создать точку. Попробуйте позже');
      throw err;
    }
    setIncidents((prev) => [savedPoint, ...prev]);
    handleSelectIncident(savedPoint);
    return savedPoint;
  };

  // Удаление точки
  const handleDeletePoint = async (pointId) => {
    try {
      await api.deleteOutage(pointId);
    } catch (err) {
      alert(err.message || 'Не удалось удалить точку');
      return;
    }
    setIncidents((prev) => prev.filter((i) => i.id !== pointId && i._id !== pointId));
    if (modalIncident && (modalIncident.id === pointId || modalIncident._id === pointId)) setModalIncident(null);
    if (selectedIncident && (selectedIncident.id === pointId || selectedIncident._id === pointId)) setSelectedIncident(null);
  };

  // Изменение процесса точки
  const handleUpdatePointProcess = async (pointId, { status, progress, processStage }) => {
    let updatedData = { status, progress, processStage };
    try {
      const res = await api.updateOutage(pointId, { status, progress, processStage });
      if (res) updatedData = { ...updatedData, ...res };
    } catch (err) {
      alert(err.message || 'Не удалось обновить точку');
      throw err;
    }
    const isSame = (i) => i.id === pointId || i._id === pointId;
    setIncidents((prev) => prev.map((i) => (isSame(i) ? { ...i, ...updatedData } : i)));
    if (modalIncident && isSame(modalIncident)) setModalIncident((prev) => ({ ...prev, ...updatedData }));
    return updatedData;
  };

  // User Authentication Handlers
  const handleLoginAsAdmin = (adminUser) => {
    setUser(adminUser);
    setSavedUser(adminUser);
  };

  const handleAuthSuccess = (loggedUser) => {
    setUser(loggedUser);
    loadOutages();
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
  };

  // Cabinet (org / admin): применяем смену статуса
  const handleStatusChangeSuccess = (updatedOutage) => {
    setIncidents((prev) =>
      prev.map((inc) =>
        inc._id === updatedOutage._id || inc.id === updatedOutage.id ? { ...inc, ...updatedOutage } : inc
      )
    );
  };

  // Location Picker Handlers
  const handleStartPickOnMap = () => {
    setIsAdminModalOpen(false);
    setIsSelectingLocation(true);
    if (isMobileNow()) setIsSidebarOpen(false); // карта должна быть видна
  };

  const handleLocationSelected = ({ lat, lng }) => {
    setPickedCoordinates({ lat, lng });
    setIsSelectingLocation(false);
    setIsAdminModalOpen(true);
  };

  const handleCancelSelectingLocation = () => {
    setIsSelectingLocation(false);
    setIsAdminModalOpen(true);
  };

  // Quick Open Admin Panel with focus on specific point
  const handleOpenAdminWithPoint = (pt) => {
    setSelectedIncident(pt);
    setIsAdminModalOpen(true);
  };

  return (
    <div className={`svetanet-app${isSidebarOpen ? ' sidebar-open' : ''}`}>
      <Navbar
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
        onOpenCabinetModal={() => setIsCabinetModalOpen(true)}
        user={user}
        isAdmin={isAdmin}
        onLogout={handleLogout}
        isApiOnline={backendConnected}
        onRefreshApi={loadOutages}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
      />

      <StatsBanner
        incidents={incidents}
        activeTypeFilter={filterType}
        onSelectTypeFilter={(t) => setFilterType(t)}
      />

      <main className="svetanet-main-layout">
        <IncidentSidebar
          incidents={filteredIncidents}
          allIncidents={incidents}
          selectedIncident={selectedIncident}
          onSelectIncident={handleSelectIncident}
          onOpenDetails={(inc) => setModalIncident(inc)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterType={filterType}
          onFilterTypeChange={setFilterType}
          selectedDistrict={selectedDistrict}
          onSelectDistrict={setSelectedDistrict}
          onConfirmOutage={async (id) => {
            try {
              await api.confirmOutage(id);
              loadOutages();
            } catch (err) {
              alert(err.message || 'Не удалось подтвердить');
            }
          }}
          user={user}
          isAdmin={isAdmin}
          onDeletePoint={handleDeletePoint}
          onOpenAdminWithPoint={handleOpenAdminWithPoint}
          isOpen={isSidebarOpen}
        />

        <div className="map-container-area">
          <IncidentMap
            incidents={filteredIncidents}
            selectedIncident={selectedIncident}
            onSelectIncident={(inc) => setSelectedIncident(inc)}
            onOpenDetails={(inc) => setModalIncident(inc)}
            selectedDistrict={selectedDistrict}
            user={user}
            isAdmin={isAdmin}
            onDeletePoint={handleDeletePoint}
            onOpenAdminWithPoint={handleOpenAdminWithPoint}
            isSelectingLocation={isSelectingLocation}
            onLocationSelected={handleLocationSelected}
            onCancelSelectingLocation={handleCancelSelectingLocation}
          />
        </div>
      </main>

      {/* Details Modal */}
      {modalIncident && (
        <IncidentModal
          incident={modalIncident}
          onClose={() => setModalIncident(null)}
          onFocusOnMap={(inc) => setSelectedIncident(inc)}
          isAdmin={isAdmin}
          onDeletePoint={handleDeletePoint}
          onUpdateProcess={handleUpdatePointProcess}
        />
      )}

      {/* Citizen Report Modal */}
      <ReportIncidentModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onAddIncident={handleAddPoint}
      />

      {/* Admin Panel Modal (Таблица мониторинга, поставить точку, удалить, изменить процесс) */}
      <AdminPanelModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        user={user}
        onLoginAsAdmin={handleLoginAsAdmin}
        onLogout={handleLogout}
        incidents={incidents}
        onAddPoint={handleAddPoint}
        onDeletePoint={handleDeletePoint}
        onUpdatePointProcess={handleUpdatePointProcess}
        onFocusOnMap={(inc) => setSelectedIncident(inc)}
        onStartPickOnMap={handleStartPickOnMap}
        pickedCoordinates={pickedCoordinates}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Cabinet Modal (org / admin) */}
      {user && (
        <CabinetModal
          isOpen={isCabinetModalOpen}
          onClose={() => setIsCabinetModalOpen(false)}
          user={user}
          onStatusChangeSuccess={handleStatusChangeSuccess}
        />
      )}
    </div>
  );
}