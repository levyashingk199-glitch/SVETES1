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
import { INCIDENT_TYPES, INCIDENT_STATUSES, TASHKENT_DISTRICTS, INITIAL_INCIDENTS } from './data/incidents';
import { api, getSavedUser, setSavedUser, getToken, getLocalIncidents, setLocalIncidents } from './api';
import './App.css';

export default function App() {
  const [incidents, setIncidents] = useState(() => getLocalIncidents());
  const [backendConnected, setBackendConnected] = useState(false);
  const [user, setUser] = useState(() => getSavedUser());

  // Modals state
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCabinetModalOpen, setIsCabinetModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [modalIncident, setModalIncident] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Map Location Picker State
  const [isSelectingLocation, setIsSelectingLocation] = useState(false);
  const [pickedCoordinates, setPickedCoordinates] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'planned', 'electricity', 'water', 'gas'
  const [selectedDistrict, setSelectedDistrict] = useState(TASHKENT_DISTRICTS[0]); // 'Все районы'

  const isAdmin = user?.role === 'admin' || user?.email === 'admin@netsveta.dev';

  // Загрузка аварий и отключений из API или локального кэша
  const loadOutages = useCallback(async () => {
    try {
      const items = await api.getOutages();
      if (items && Array.isArray(items) && items.length > 0) {
        setIncidents(items);
        setLocalIncidents(items);
        setBackendConnected(true);
        return;
      }
    } catch (error) {
      console.warn('Backend offline / request error, using public points and local storage:', error.message);
      setBackendConnected(false);
    }
    // Если бэкенд не ответил или вернул пустоту, загружаем локальный список с гарантированными базовыми точками
    const saved = getLocalIncidents();
    setIncidents(saved);
  }, []);

  useEffect(() => {
    loadOutages();

    // Автоматическая фоновая синхронизация каждые 8 секунд:
    // если другой пользователь добавит точку или подтвердит проблему, она тут же отобразится у всех!
    const pollInterval = setInterval(() => {
      loadOutages();
    }, 8000);

    // Проверяем авторизацию, если есть токен
    if (getToken()) {
      api.getMe()
        .then((u) => setUser(u))
        .catch(() => {});
    }

    return () => clearInterval(pollInterval);
  }, [loadOutages]);

  // Фильтрация инцидентов
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

  // Добавление новой точки отключения
  const handleAddPoint = async (pointData) => {
    let savedPoint = null;
    try {
      savedPoint = await api.createOutage(pointData);
    } catch (err) {
      if (err.status >= 400 && err.status < 500) {
        alert(err.message || 'Слишком часто. Подождите минуту перед следующей точкой');
        throw err;
      }
      console.warn('Backend create failed, saving in local mode:', err.message);
      const localId = `point-${Date.now()}`;
      savedPoint = {
        ...pointData,
        id: localId,
        _id: localId,
        reportsCount: 1,
        progress: 15,
        processStage: 'Заявка зарегистрирована в системе',
        reportedAt: 'Только что',
        estimatedResolution: 'Уточняется диспетчером',
      };
    }

    setIncidents((prev) => {
      const nextList = [savedPoint, ...prev];
      setLocalIncidents(nextList);
      return nextList;
    });
    setSelectedIncident(savedPoint);
    return savedPoint;
  };

  // Удаление точки
  const handleDeletePoint = async (pointId) => {
    try {
      await api.deleteOutage(pointId);
    } catch (err) {
      console.warn('Backend delete failed, removing locally:', err.message);
    }

    setIncidents((prev) => {
      const nextList = prev.filter((i) => i.id !== pointId && i._id !== pointId);
      setLocalIncidents(nextList);
      return nextList;
    });

    if (modalIncident && (modalIncident.id === pointId || modalIncident._id === pointId)) {
      setModalIncident(null);
    }
    if (selectedIncident && (selectedIncident.id === pointId || selectedIncident._id === pointId)) {
      setSelectedIncident(null);
    }
  };

  // Изменение процесса точки (прогресс, статус)
  const handleUpdatePointProcess = async (pointId, { status, progress, processStage }) => {
    let updatedData = { status, progress, processStage };
    try {
      const res = await api.updateOutage(pointId, { status, progress, processStage });
      if (res) updatedData = { ...updatedData, ...res };
    } catch (err) {
      console.warn('Backend update failed, updating locally:', err.message);
    }

    setIncidents((prev) => {
      const nextList = prev.map((i) =>
        i.id === pointId || i._id === pointId ? { ...i, ...updatedData, status, progress, processStage } : i
      );
      setLocalIncidents(nextList);
      return nextList;
    });

    if (modalIncident && (modalIncident.id === pointId || modalIncident._id === pointId)) {
      setModalIncident((prev) => ({ ...prev, ...updatedData, status, progress, processStage }));
    }
    return updatedData;
  };

  // Подтверждение проблемы жителем (+1)
  const handleConfirmOutage = async (id) => {
    try {
      await api.confirmOutage(id);
      loadOutages();
    } catch (err) {
      console.warn('API confirm failed, incrementing locally:', err.message);
      setIncidents((prev) => {
        const nextList = prev.map((i) =>
          i.id === id || i._id === id ? { ...i, reportsCount: (i.reportsCount || 1) + 1 } : i
        );
        setLocalIncidents(nextList);
        return nextList;
      });
    }
  };

  // Аутентификация
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

  const handleStatusChangeSuccess = (updatedOutage) => {
    setIncidents((prev) => {
      const nextList = prev.map((inc) =>
        inc._id === updatedOutage._id || inc.id === updatedOutage.id ? { ...inc, ...updatedOutage } : inc
      );
      setLocalIncidents(nextList);
      return nextList;
    });
  };

  // Выбор точки на карте
  const handleStartPickOnMap = () => {
    setIsAdminModalOpen(false);
    setIsSelectingLocation(true);
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

  const handleOpenAdminWithPoint = (pt) => {
    setSelectedIncident(pt);
    setIsAdminModalOpen(true);
  };

  return (
    <div className="svetanet-app">
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
          onSelectIncident={(inc) => setSelectedIncident(inc)}
          onOpenDetails={(inc) => setModalIncident(inc)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterType={filterType}
          onFilterTypeChange={setFilterType}
          selectedDistrict={selectedDistrict}
          onSelectDistrict={setSelectedDistrict}
          onConfirmOutage={handleConfirmOutage}
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

      {/* Admin Panel Modal */}
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

      {/* Cabinet Modal */}
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
