
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
import { INCIDENT_STATUSES, TASHKENT_DISTRICTS } from './data/incidents';
import {
  api,
  startApiWarmup,
  getSavedUser,
  setSavedUser,
  getToken,
  getLocalIncidents,
  setLocalIncidents
} from './api';

import './App.css';
import './responsive.css';

const MOBILE_QUERY = '(max-width: 768px)';

const isMobileNow = () =>
  typeof window !== 'undefined' &&
  window.matchMedia(MOBILE_QUERY).matches;

export default function App() {
  const [incidents, setIncidents] = useState(() => getLocalIncidents());
  const [backendConnected, setBackendConnected] = useState(false);
  const [apiError, setApiError] = useState('');
  const [apiChecking, setApiChecking] = useState(true);
  const [user, setUser] = useState(() => getSavedUser());

  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCabinetModalOpen, setIsCabinetModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [modalIncident, setModalIncident] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => !isMobileNow());

  const [isSelectingLocation, setIsSelectingLocation] = useState(false);
  const [pickedCoordinates, setPickedCoordinates] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedDistrict, setSelectedDistrict] = useState(TASHKENT_DISTRICTS[0]);

  const isAdmin =
    user?.role === 'admin';

  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');

    if (meta) {
      meta.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = (event) => setIsSidebarOpen(!event.matches);

    mq.addEventListener('change', onChange);

    return () => mq.removeEventListener('change', onChange);
  }, []);

  const loadOutages = useCallback(async () => {
    try {
      const response = await api.getOutages();
      const items = Array.isArray(response)
        ? response
        : response?.outages || response?.data || response?.items;

      if (!Array.isArray(items)) {
        throw new Error('Сервер вернул неверный формат списка точек');
      }

      setIncidents(items);
      setLocalIncidents(items);
      setBackendConnected(true);
      setApiError('');
    } catch (error) {
      console.warn('Backend is unavailable:', error.message);

      setBackendConnected(false);
      setApiError(
        error.status
          ? `HTTP ${error.status}: ${error.message}`
          : error.cause?.message || error.message
      );

      setIncidents(getLocalIncidents());
    } finally {
      setApiChecking(false);
    }
  }, []);

  useEffect(() => {
    const stopWarmup = startApiWarmup();

    loadOutages();

    if (getToken()) {
      api.getMe()
        .then((loggedUser) => setUser(loggedUser))
        .catch(() => {
          api.logout();
          setUser(null);
        });
    } else if (user) {
      api.logout();
      setUser(null);
    }

    return stopWarmup;
  }, [loadOutages]);

  useEffect(() => {
    const delay = backendConnected ? 20000 : 15000;

    const id = setInterval(() => {
      if (!backendConnected || !document.hidden) {
        loadOutages();
      }
    }, delay);

    return () => clearInterval(id);
  }, [backendConnected, loadOutages]);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      if (
        selectedDistrict !== 'Все районы' &&
        incident.district !== selectedDistrict
      ) {
        return false;
      }

      if (filterType === 'planned') {
        if (incident.status !== INCIDENT_STATUSES.PLANNED) return false;
      } else if (filterType !== 'all' && incident.type !== filterType) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();

        const matchesAddress = incident.address?.toLowerCase().includes(query);
        const matchesMahalla = incident.mahalla?.toLowerCase().includes(query);
        const matchesTitle = incident.title?.toLowerCase().includes(query);
        const matchesDistrict = incident.district?.toLowerCase().includes(query);

        if (
          !matchesAddress &&
          !matchesMahalla &&
          !matchesTitle &&
          !matchesDistrict
        ) {
          return false;
        }
      }

      return true;
    });
  }, [incidents, selectedDistrict, filterType, searchQuery]);

  const handleSelectIncident = (incident) => {
    setSelectedIncident(incident);

    if (isMobileNow()) {
      setIsSidebarOpen(false);
    }
  };

  const handleAddPoint = async (pointData) => {
    try {
      const savedPoint = await api.createOutage(pointData);

      setIncidents((previous) => {
        const nextList = [savedPoint, ...previous];
        setLocalIncidents(nextList);
        return nextList;
      });

      handleSelectIncident(savedPoint);
      return savedPoint;
    } catch (error) {
      alert(error.message || 'Не удалось создать точку на сервере');
      throw error;
    }
  };

  const handleDeletePoint = async (pointId) => {
    try {
      await api.deleteOutage(pointId);
    } catch (error) {
      alert(error.message || 'Не удалось удалить точку на сервере');
      return;
    }

    setIncidents((previous) => {
      const nextList = previous.filter(
        (incident) => incident.id !== pointId && incident._id !== pointId
      );
      setLocalIncidents(nextList);
      return nextList;
    });

    if (modalIncident?.id === pointId || modalIncident?._id === pointId) {
      setModalIncident(null);
    }

    if (selectedIncident?.id === pointId || selectedIncident?._id === pointId) {
      setSelectedIncident(null);
    }
  };

  const handleUpdatePointProcess = async (
    pointId,
    { status, progress, processStage }
  ) => {
    const patchPayload = {
      status,
      progress,
      ...(processStage !== undefined ? { processStage } : {})
    };

    const response = await api.updateOutage(pointId, patchPayload);
    const updatedData = { ...patchPayload, ...response };

    setIncidents((previous) => {
      const nextList = previous.map((incident) =>
        incident.id === pointId || incident._id === pointId
          ? { ...incident, ...updatedData }
          : incident
      );
      setLocalIncidents(nextList);
      return nextList;
    });

    if (modalIncident?.id === pointId || modalIncident?._id === pointId) {
      setModalIncident((previous) => ({ ...previous, ...updatedData }));
    }

    return updatedData;
  };

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
    setSavedUser(null);
  };

  const handleStatusChangeSuccess = (updatedOutage) => {
    setIncidents((previous) => {
      const nextList = previous.map((incident) =>
        incident._id === updatedOutage._id ||
        incident.id === updatedOutage.id
          ? { ...incident, ...updatedOutage }
          : incident
      );

      setLocalIncidents(nextList);
      return nextList;
    });
  };

  const handleStartPickOnMap = () => {
    setIsAdminModalOpen(false);
    setIsSelectingLocation(true);

    if (isMobileNow()) {
      setIsSidebarOpen(false);
    }
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

  const handleOpenAdminWithPoint = (point) => {
    setSelectedIncident(point);
    setIsAdminModalOpen(true);
  };

  const handleConfirmOutage = async (id) => {
    try {
      await api.confirmOutage(id);
      await loadOutages();
    } catch (error) {
      alert(error.message || 'Не удалось подтвердить заявку на сервере');
    }
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
        isApiChecking={apiChecking}
        apiError={apiError}
        onRefreshApi={loadOutages}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((previous) => !previous)}
      />

      <StatsBanner
        incidents={incidents}
        activeTypeFilter={filterType}
        onSelectTypeFilter={setFilterType}
      />

      <main className="svetanet-main-layout">
        <IncidentSidebar
          incidents={filteredIncidents}
          allIncidents={incidents}
          selectedIncident={selectedIncident}
          onSelectIncident={handleSelectIncident}
          onOpenDetails={(incident) => setModalIncident(incident)}
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
            onSelectIncident={handleSelectIncident}
            onOpenDetails={(incident) => setModalIncident(incident)}
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

      {modalIncident && (
        <IncidentModal
          incident={modalIncident}
          onClose={() => setModalIncident(null)}
          onFocusOnMap={handleSelectIncident}
          isAdmin={isAdmin}
          onDeletePoint={handleDeletePoint}
          onUpdateProcess={handleUpdatePointProcess}
        />
      )}

      <ReportIncidentModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onAddIncident={handleAddPoint}
      />

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
        onFocusOnMap={handleSelectIncident}
        onStartPickOnMap={handleStartPickOnMap}
        pickedCoordinates={pickedCoordinates}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

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
