import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons for different status
const createCustomIcon = (color) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const redIcon = createCustomIcon('red');
const orangeIcon = createCustomIcon('orange');
const greenIcon = createCustomIcon('green');
const blueIcon = createCustomIcon('blue');

// Component to update map center when location changes
const MapUpdater = ({ center }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center && center.length === 2) {
      map.setView(center, 13);
    }
  }, [center, map]);
  
  return null;
};

const IssueMap = ({ issues = null, onMarkerClick = null, center = null, showCenterMarker = true }) => {
  const [mapCenter, setMapCenter] = useState([16.0716, 77.9053]); // Default fallback
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  // Map Filter and View States
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [mapViewMode, setMapViewMode] = useState('pins'); // 'pins' | 'heatmap'
  
  // Debug logging
  console.log('IssueMap received issues:', issues);

  // Get user's current location
  useEffect(() => {
    const getCurrentLocation = () => {
      if (!navigator.geolocation) {
        setLocationError('Geolocation is not supported by this browser.');
        setIsLoadingLocation(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newLocation = [latitude, longitude];
          setUserLocation(newLocation);
          setMapCenter(newLocation);
          setIsLoadingLocation(false);
          console.log('User location obtained:', newLocation);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocationError('Unable to retrieve your location. Using default location.');
          setIsLoadingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    };

    // If center is provided, use it; otherwise get user location
    if (center && Array.isArray(center) && center.length === 2) {
      setMapCenter(center);
      setUserLocation(center);
      setIsLoadingLocation(false);
    } else {
      getCurrentLocation();
    }
  }, [center]);

  // Generate nearby issues based on user location if none are provided
  const generateNearbyIssues = (userLoc) => {
    if (!userLoc) return [];
    
    const baseIssues = [
      {
        id: '1',
        title: 'Broken Street Light',
        location: 'Near Your Location',
        coordinates: [userLoc[0] + 0.001, userLoc[1] + 0.001],
        status: 'reported',
        upvotes: 15,
        description: 'Street light has been broken for 3 days',
        category: 'Street Lighting',
        priority: 'high'
      },
      {
        id: '2',
        title: 'Pothole on Main Road',
        location: 'Near Your Location',
        coordinates: [userLoc[0] + 0.002, userLoc[1] - 0.001],
        status: 'in-progress',
        upvotes: 28,
        description: 'Large pothole causing traffic issues',
        category: 'Road & Traffic',
        priority: 'medium'
      },
      {
        id: '3',
        title: 'Garbage Overflow',
        location: 'Near Your Location',
        coordinates: [userLoc[0] - 0.001, userLoc[1] + 0.002],
        status: 'resolved',
        upvotes: 42,
        description: 'Garbage bin overflowing since Monday',
        category: 'Garbage & Sanitation',
        priority: 'low'
      },
      {
        id: '4',
        title: 'Water Leakage',
        location: 'Near Your Location',
        coordinates: [userLoc[0] + 0.003, userLoc[1] + 0.001],
        status: 'reported',
        upvotes: 8,
        description: 'Water pipe leaking on footpath',
        category: 'Water & Drainage',
        priority: 'medium'
      },
      {
        id: '5',
        title: 'Traffic Signal Malfunction',
        location: 'Near Your Location',
        coordinates: [userLoc[0] - 0.002, userLoc[1] - 0.002],
        status: 'in-progress',
        upvotes: 35,
        description: 'Traffic signal not working properly',
        category: 'Road & Traffic',
        priority: 'high'
      }
    ];
    
    return baseIssues;
  };

  // Use provided issues or generate nearby issues based on user location
  const displayIssues = issues || (userLocation ? generateNearbyIssues(userLocation) : []);

  // Filter display issues locally
  const filteredDisplayIssues = displayIssues.filter(issue => {
    const matchesCategory = filterCategory === 'all' || 
      (issue.category && issue.category.toLowerCase().includes(filterCategory.toLowerCase()));
      
    const matchesStatus = filterStatus === 'all' || 
      (issue.status && issue.status.toLowerCase() === filterStatus.toLowerCase());
      
    const matchesPriority = filterPriority === 'all' || 
      (issue.priority && issue.priority.toLowerCase() === filterPriority.toLowerCase());
      
    return matchesCategory && matchesStatus && matchesPriority;
  });

  const getMarkerIcon = (status) => {
    switch (status) {
      case 'reported':
        return redIcon;
      case 'in-progress':
      case 'accepted':
      case 'assigned':
      case 'escalated':
        return orangeIcon;
      case 'resolved':
        return greenIcon;
      default:
        return redIcon;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'reported':
        return 'Reported';
      case 'in-progress':
      case 'accepted':
      case 'assigned':
      case 'escalated':
        return 'In Progress';
      case 'resolved':
        return 'Resolved';
      default:
        return 'Unknown';
    }
  };

  const handleMarkerClick = (issue) => {
    if (onMarkerClick) {
      onMarkerClick(issue);
    }
  };

  return (
    <div className="map-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Premium Glassmorphic Map Control Panel */}
      <div style={{
        position: 'absolute',
        top: '12px',
        left: '50px', // Shift slightly right to avoid Leaflet zoom controls (+/-) which are top-left
        zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '12px',
        padding: '0.75rem 1.25rem',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        flexWrap: 'wrap',
        maxWidth: 'calc(100% - 70px)',
        boxSizing: 'border-box'
      }}>
        {/* Toggle Mode */}
        <div style={{ display: 'flex', gap: '0.25rem', background: '#f1f5f9', padding: '0.2rem', borderRadius: '8px' }}>
          <button
            type="button"
            onClick={() => setMapViewMode('pins')}
            style={{
              background: mapViewMode === 'pins' ? '#1e4359' : 'transparent',
              color: mapViewMode === 'pins' ? 'white' : '#64748b',
              border: 'none',
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
          >
            📍 Pins
          </button>
          <button
            type="button"
            onClick={() => setMapViewMode('heatmap')}
            style={{
              background: mapViewMode === 'heatmap' ? '#1e4359' : 'transparent',
              color: mapViewMode === 'heatmap' ? 'white' : '#64748b',
              border: 'none',
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
          >
            🔥 Heatmap
          </button>
        </div>

        <div style={{ height: '20px', width: '1px', background: '#cbd5e1' }} />

        {/* Filter Dropdowns */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Category */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{
              background: 'white',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '0.35rem 0.5rem',
              fontSize: '0.8rem',
              fontWeight: '500',
              color: '#334155',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="all">All Categories</option>
            <option value="road">Road Damage</option>
            <option value="water">Water Leakage</option>
            <option value="garbage">Garbage & Sanitation</option>
            <option value="light">Streetlight Failure</option>
            <option value="drain">Drainage Issue</option>
            <option value="traffic">Traffic Issue</option>
            <option value="infrastructure">Public Infrastructure</option>
            <option value="environmental">Environmental Hazard</option>
            <option value="other">Other</option>
          </select>

          {/* Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              background: 'white',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '0.35rem 0.5rem',
              fontSize: '0.8rem',
              fontWeight: '500',
              color: '#334155',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="all">All Status</option>
            <option value="reported">Reported</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>

          {/* Priority */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            style={{
              background: 'white',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '0.35rem 0.5rem',
              fontSize: '0.8rem',
              fontWeight: '500',
              color: '#334155',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="all">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      <MapContainer
        key={`${mapCenter[0]},${mapCenter[1]}`}
        center={mapCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <MapUpdater center={mapCenter} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* User location marker */}
        {userLocation && showCenterMarker && (
          <Marker position={userLocation} icon={blueIcon}>
            <Popup>
              <div style={{ minWidth: '150px', textAlign: 'center' }}>
                <h4 style={{ 
                  margin: '0 0 8px 0', 
                  fontSize: '14px', 
                  fontWeight: '600',
                  color: '#1e293b'
                }}>
                  📍 Your Location
                </h4>
                <p style={{ 
                  margin: '4px 0', 
                  fontSize: '12px', 
                  color: '#64748b' 
                }}>
                  {userLocation[0].toFixed(4)}, {userLocation[1].toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Render Heatmap Circles */}
        {mapViewMode === 'heatmap' && filteredDisplayIssues.map((issue) => (
          <Circle
            key={`heat-${issue.id}`}
            center={issue.coordinates}
            radius={180 + (issue.upvotes || 0) * 8}
            pathOptions={{
              color: issue.status === 'resolved' ? '#10b981' : (['in-progress', 'accepted', 'assigned', 'escalated'].includes(issue.status) ? '#f59e0b' : '#ef4444'),
              fillColor: issue.status === 'resolved' ? '#10b981' : (['in-progress', 'accepted', 'assigned', 'escalated'].includes(issue.status) ? '#f59e0b' : '#ef4444'),
              fillOpacity: 0.35,
              stroke: false
            }}
          >
            <Popup>
              <div style={{ minWidth: '180px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                  🔥 Concentration Point
                </h4>
                <p style={{ margin: '2px 0', fontSize: '12px', color: '#475569' }}>
                  <strong>Title:</strong> {issue.title}
                </p>
                <p style={{ margin: '2px 0', fontSize: '12px', color: '#475569' }}>
                  <strong>Category:</strong> {issue.category || 'General'}
                </p>
                <p style={{ margin: '2px 0', fontSize: '12px', color: '#475569' }}>
                  <strong>Upvotes:</strong> {issue.upvotes}
                </p>
                <p style={{ margin: '2px 0', fontSize: '12px', color: '#475569' }}>
                  <strong>Priority:</strong> {issue.priority || 'medium'}
                </p>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* Render standard markers */}
        {mapViewMode === 'pins' && filteredDisplayIssues.map((issue) => (
          <Marker
            key={issue.id}
            position={issue.coordinates}
            icon={getMarkerIcon(issue.status)}
            eventHandlers={{
              click: () => handleMarkerClick(issue),
            }}
          >
            <Popup>
              <div style={{ minWidth: '200px' }}>
                <h4 style={{ 
                  margin: '0 0 8px 0', 
                  fontSize: '14px', 
                  fontWeight: '600',
                  color: '#1e293b'
                }}>
                  {issue.title}
                </h4>
                <p style={{ 
                  margin: '4px 0', 
                  fontSize: '12px', 
                  color: '#64748b' 
                }}>
                  📍 {issue.location}
                </p>
                <p style={{ 
                  margin: '4px 0', 
                  fontSize: '12px', 
                  color: '#64748b' 
                }}>
                  {issue.description}
                </p>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginTop: '8px'
                }}>
                  <span style={{ 
                    fontSize: '11px', 
                    padding: '2px 6px',
                    borderRadius: '10px',
                    background: issue.status === 'reported' ? '#fef3c7' : 
                              (['in-progress', 'accepted', 'assigned', 'escalated'].includes(issue.status) ? '#dbeafe' : '#d1fae5'),
                    color: issue.status === 'reported' ? '#92400e' : 
                           (['in-progress', 'accepted', 'assigned', 'escalated'].includes(issue.status) ? '#1e40af' : '#065f46')
                  }}>
                    {getStatusText(issue.status)}
                  </span>
                  <span style={{ 
                    fontSize: '11px', 
                    color: '#64748b' 
                  }}>
                    👍 {issue.upvotes}
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default IssueMap;