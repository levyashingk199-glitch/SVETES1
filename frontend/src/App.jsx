import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar/Navbar';
import StatsBanner from './components/Stats/StatsBanner';
import IncidentMap from './components/Map/IncidentMap';
import IncidentSidebar from './components/Sidebar/IncidentSidebar';
import IncidentModal from './components/Modal/IncidentModal';
import ReportIncidentModal from './components/Modal/ReportIncidentModal';
<<<<<<< HEAD
import AdminPanelModal from './components/Admin/AdminPanelModal';
import AuthModal from './components/Modal/AuthModal';
import { INCIDENT_TYPES, INCIDENT_STATUSES, TASHKENT_DISTRICTS } from './data/incidents';
import { api, getSavedUser, setSavedUser, getToken, getLocalIncidents, setLocalIncidents } from './api';
=======
import AuthModal from './components/Modal/AuthModal';
import CabinetModal from './components/Modal/CabinetModal';
import { INITIAL_INCIDENTS, TASHKENT_DISTRICTS } from './data/incidents';
import { api, getSavedUser } from './api';
>>>>>>> 1c88a52 (Initial project)
import './App.css';

export default function App() {
  // Only real user & admin points; no fake mock data
  const [incidents, setIncidents] = useState(() => getLocalIncidents());
  const [backendConnected, setBackendConnected] = useState(false);
  const [user, setUser] = useState(() => getSavedUser());

<<<<<<< HEAD
  // Modals state
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
=======
  // Auth state
  const [user, setUser] = useState(() => getSavedUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCabinetModalOpen, setIsCabinetModalOpen] = useState(false);

  const fetchOutages = useCallback(() => {
    api.getOutages()
      .then((items) => {
        setIncidents(items.length > 0 ? items : INITIAL_INCIDENTS);
        setBackendConnected(true);
      })
      .catch((error) => {
        console.warn('Backend is unavailable; showing demo data:', error.message);
        setBackendConnected(false);
      });
  }, []);

  useEffect(() => {
    fetchOutages();
  }, [fetchOutages]);

  const [selectedIncident, setSelectedIncident] = useState(null);
  const [modalIncident, setModalIncident] = useState(null);
>>>>>>> 1c88a52 (Initial project)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [modalIncident, setModalIncident] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Map Location Picker State
  const [isSelectingLocation, setIsSelectingLocation] = useState(false);
  const [pickedCoordinates, setPickedCoordinates] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
<<<<<<< HEAD
  const [filterType, setFilterType] = useState('all'); // 'all', 'planned', 'electricity', 'water', 'gas'
  const [selectedDistrict, setSelectedDistrict] = useState(TASHKENT_DISTRICTS[0]); // 'Все районы'
=======
  const [filterType, setFilterType] = useState('all');
  const [selectedDistrict, setSelectedDistrict] = useState(TASHKENT_DISTRICTS[0]);
>>>>>>> 1c88a52 (Initial project)

  const isAdmin = user?.role === 'admin' || user?.email === 'admin@netsveta.dev';

  // Load Outages from Backend API or user localStorage (zero mock data)
  const loadOutages = useCallback(async () => {
    try {
      const items = await api.getOutages();
      if (items && Array.isArray(items)) {
        setIncidents(items);
        setLocalIncidents(items);
        setBackendConnected(true);
        return;
      }
    } catch (error) {
      console.warn('Backend is offline, using user local storage:', error.message);
      setBackendConnected(false);
    }
    // Load existing points saved by user/admin
    const saved = getLocalIncidents();
    setIncidents(saved);
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
<<<<<<< HEAD
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
=======
      if (selectedDistrict !== 'Все районы' && inc.district !== selectedDistrict) return false;
      if (filterType !== 'all' && inc.type !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesAddress = inc.address?.toLowerCase().includes(q);
        const matchesMahalla = inc.mahalla?.toLowerCase().includes(q);
        const matchesTitle = inc.title?.toLowerCase().includes(q);
        const matchesDistrict = inc.district?.toLowerCase().includes(q);
        if (!matchesAddress && !matchesMahalla && !matchesTitle && !matchesDistrict) return false;
>>>>>>> 1c88a52 (Initial project)
      }
      return true;
    });
  }, [incidents, selectedDistrict, filterType, searchQuery]);

  // Place a new point (Planned Works or Emergency) - created by real people/admin
  const handleAddPoint = async (pointData) => {
    let savedPoint = null;
    try {
      savedPoint = await api.createOutage(pointData);
    } catch (err) {
      console.warn('Backend create failed, saving in local mode:', err.message);
      const localId = `point-${Date.now()}`;
      savedPoint = {
        ...pointData,
        id: localId,
        _id: localId,
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

<<<<<<< HEAD
  // Delete point (Удаление точки)
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

  // Update Point Process (Изменять процесс точки)
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

  // User Authentication Handlers
  const handleLoginAsAdmin = (adminUser) => {
    setUser(adminUser);
    setSavedUser(adminUser);
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
  };

  // Location Picker Handlers
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

  // Quick Open Admin Panel with focus on specific point
  const handleOpenAdminWithPoint = (pt) => {
    setSelectedIncident(pt);
    setIsAdminModalOpen(true);
=======
  const handleAuthSuccess = (loggedUser) => {
    setUser(loggedUser);
    setBackendConnected(true);
    fetchOutages();
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
  };

  const handleStatusChangeSuccess = (updatedOutage) => {
    setIncidents((prev) =>
      prev.map((inc) =>
        inc._id === updatedOutage._id || inc.id === updatedOutage.id ? { ...inc, ...updatedOutage } : inc
      )
    );
>>>>>>> 1c88a52 (Initial project)
  };

  return (
    <div className="svetanet-app">
      <Navbar
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
<<<<<<< HEAD
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
        user={user}
        isAdmin={isAdmin}
        onLogout={handleLogout}
        isApiOnline={backendConnected}
        onRefreshApi={loadOutages}
=======
        onOpenCabinetModal={() => setIsCabinetModalOpen(true)}
        user={user}
        onLogout={handleLogout}
        isApiOnline={backendConnected}
        onRefreshApi={fetchOutages}
>>>>>>> 1c88a52 (Initial project)
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
<<<<<<< HEAD
          onSelectIncident={(inc) => setSelectedIncident(inc)}
          onOpenDetails={(inc) => setModalIncident(inc)}
=======
          onSelectIncident={setSelectedIncident}
          onOpenDetails={setModalIncident}
>>>>>>> 1c88a52 (Initial project)
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
            } catch {
              // Local increment
              setIncidents((prev) => {
                const nextList = prev.map((i) =>
                  i.id === id || i._id === id ? { ...i, reportsCount: (i.reportsCount || 0) + 1 } : i
                );
                setLocalIncidents(nextList);
                return nextList;
              });
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
<<<<<<< HEAD
            onSelectIncident={(inc) => setSelectedIncident(inc)}
            onOpenDetails={(inc) => setModalIncident(inc)}
=======
            onSelectIncident={setSelectedIncident}
            onOpenDetails={setModalIncident}
>>>>>>> 1c88a52 (Initial project)
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
<<<<<<< HEAD
          onFocusOnMap={(inc) => setSelectedIncident(inc)}
          isAdmin={isAdmin}
          onDeletePoint={handleDeletePoint}
          onUpdateProcess={handleUpdatePointProcess}
        />
      )}

      {/* Citizen Report Modal */}
=======
          onFocusOnMap={setSelectedIncident}
        />
      )}

      {/* Report Incident Modal */}
>>>>>>> 1c88a52 (Initial project)
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

      {/* General Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(loggedUser) => setUser(loggedUser)}
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
