import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  LogOut,
  Settings,
  Filter,
  Search,
  MapPin,
  UserPlus,
  Edit,
  Trash2,
  X,
  Save
} from 'lucide-react';
import IssueMap from './IssueMap';
import ResolutionCharts from './analytics/ResolutionCharts';
import apiService from '../services/api';

const AdminDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [selectedView, setSelectedView] = useState('overview');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortMode, setSortMode] = useState('priority'); // 'priority' | 'date'
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // AI-powered Civic Insights states
  const [civicInsights, setCivicInsights] = useState(null);
  const [predictiveInsights, setPredictiveInsights] = useState(null);
  const [executiveGovernance, setExecutiveGovernance] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiTab, setAiTab] = useState('charts'); // 'charts' | 'civic' | 'predictive' | 'governance'

  const handleLogout = () => {
    localStorage.removeItem('intellicivic_admin');
    navigate('/');
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const resp = await apiService.getAdminDashboard();
        setStats(resp.data || resp);
      } catch (e) {
        toast.error(`Failed to load dashboard: ${e.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchAiData = async (type) => {
    setLoadingAi(true);
    try {
      if (type === 'civic' && !civicInsights) {
        const resp = await apiService.getCivicInsights();
        setCivicInsights(resp.data || resp);
      } else if (type === 'predictive' && !predictiveInsights) {
        const resp = await apiService.getPredictiveInsights();
        setPredictiveInsights(resp.data || resp);
      } else if (type === 'governance' && !executiveGovernance) {
        const resp = await apiService.getExecutiveGovernance();
        setExecutiveGovernance(resp.data || resp);
      }
    } catch (err) {
      toast.error(`Failed to fetch AI insights: ${err.message}`);
    } finally {
      setLoadingAi(false);
    }
  };

  useEffect(() => {
    if (selectedView === 'analytics') {
      if (aiTab !== 'charts') {
        fetchAiData(aiTab);
      }
    }
  }, [selectedView, aiTab]);

  const recentIssues = useMemo(() => {
    const list = stats?.recentIssues || [];
    const weight = { urgent: 4, high: 3, medium: 2, low: 1 };
    const unresolved = list.filter(i => i.status !== 'resolved');
    const resolved = list.filter(i => i.status === 'resolved');
    const unresolvedSorted = [...unresolved].sort((a, b) => (weight[b.priority] || 0) - (weight[a.priority] || 0));
    const resolvedSorted = [...resolved].sort((a, b) => new Date(a.resolvedAt || a.updatedAt || a.createdAt) - new Date(b.resolvedAt || b.updatedAt || b.createdAt));
    return [...unresolvedSorted, ...resolvedSorted];
  }, [stats, sortMode]);

  const filteredIssues = recentIssues.filter(issue => {
    const matchesStatus = statusFilter === 'all' || issue.status === statusFilter;
    const locName = (issue.location?.name || issue.location || '').toLowerCase();
    const matchesSearch = (issue.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         locName.includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || (issue.category === categoryFilter);
    return matchesStatus && matchesSearch && matchesCategory;
  });

  const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <div className="stat-card">
      <div className="stat-header">
        <span className="stat-title">{title}</span>
        <Icon size={20} color={color} />
      </div>
      <div className="stat-value">{value}</div>
      {subtitle && (
        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
          {subtitle}
        </div>
      )}
    </div>
  );

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      'urgent': { bg: '#fef2f2', color: '#dc2626', text: 'High' },
      'high': { bg: '#fef2f2', color: '#dc2626', text: 'High' },
      'medium': { bg: '#fef3c7', color: '#d97706', text: 'Medium' },
      'low': { bg: '#f0f9ff', color: '#2563eb', text: 'Low' }
    };
    
    const config = priorityConfig[priority] || priorityConfig['medium'];
    return (
      <span style={{
        background: config.bg,
        color: config.color,
        padding: '0.2rem 0.6rem',
        borderRadius: '12px',
        fontSize: '0.7rem',
        fontWeight: '600',
        textTransform: 'uppercase'
      }}>
        {config.text}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'reported': { class: 'status-reported', text: 'Reported' },
      'assigned': { class: 'status-in-progress', text: 'Assigned' },
      'accepted': { class: 'status-in-progress', text: 'Accepted' },
      'in-progress': { class: 'status-in-progress', text: 'In Progress' },
      'resolved': { class: 'status-resolved', text: 'Resolved' }
    };
    
    const config = statusConfig[status] || statusConfig['reported'];
    return <span className={`status-badge ${config.class}`}>{config.text}</span>;
  };

  const handleAssignIssue = async (issueId, e) => {
    e.stopPropagation();
    try {
      await apiService.assignIssue(issueId, {});
      toast.success('Issue assigned');
      const fresh = await apiService.getAdminDashboard();
      setStats(fresh.data || fresh);
    } catch (err) {
      toast.error(`Assign failed: ${err.message}`);
    }
  };

  const handleUpdateStatus = async (issueId, newStatus, e) => {
    e.stopPropagation();
    try {
      await apiService.updateIssueStatus(issueId, { status: newStatus });
      toast.success('Status updated');
      // Refresh dashboard after status update
      const fresh = await apiService.getAdminDashboard();
      setStats(fresh.data || fresh);
    } catch (err) {
      toast.error(`Update failed: ${err.message}`);
    }
  };

  return (
    <div className="admin-container">
      {/* Header */}
      <div className="admin-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h1 className="admin-title">Admin Dashboard</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
              Welcome, {user.name}
            </span>
            <button 
              onClick={() => setSelectedView(selectedView === 'settings' ? 'overview' : 'settings')}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#64748b',
                cursor: 'pointer',
                padding: '0.5rem'
              }}
            >
              <Settings size={20} />
            </button>
            <button 
              onClick={handleLogout}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#64748b',
                cursor: 'pointer',
                padding: '0.5rem'
              }}
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="admin-content">
        {/* Navigation Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem',
          marginBottom: '2rem',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '1rem'
        }}>
          {[
            { key: 'overview', label: 'Overview', icon: BarChart3 },
            { key: 'issues', label: 'Issues Management', icon: AlertTriangle },
            { key: 'employees', label: 'Employees', icon: Users },
            { key: 'map', label: 'Map View', icon: MapPin },
            { key: 'analytics', label: 'Analytics', icon: TrendingUp }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedView(tab.key)}
              style={{
                background: selectedView === tab.key ? '#1e4359' : 'transparent',
                color: selectedView === tab.key ? 'white' : '#64748b',
                border: '1px solid #e2e8f0',
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem',
                fontWeight: '500'
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Stats */}
        {selectedView === 'overview' && (
          <>
            <div className="stats-grid">
              <StatCard 
                title="Total Issues" 
                value={stats?.issues?.total || 0}
                icon={AlertTriangle}
                color="#1e4359"
                subtitle="All time reports"
              />
              <StatCard 
                title="Reported" 
                value={stats?.issues?.reported || 0}
                icon={AlertTriangle}
                color="#f59e0b"
                subtitle="Awaiting assignment"
              />
              <StatCard 
                title="In Progress" 
                value={stats?.issues?.inProgress || 0}
                icon={Clock}
                color="#3b82f6"
                subtitle="Being resolved"
              />
              <StatCard 
                title="Resolved" 
                value={stats?.issues?.resolved || 0}
                icon={CheckCircle}
                color="#10b981"
                subtitle="Successfully completed"
              />
              <StatCard 
                title="SLA Breaches" 
                value={stats?.slaBreaches || 0}
                icon={AlertTriangle}
                color="#ef4444"
                subtitle="Overdue issues"
              />
              <StatCard 
                title="Avg Resolution Time" 
                value={stats?.avgResolutionTime || '0 days'}
                icon={TrendingUp}
                color="#8b5cf6"
                subtitle="Current performance"
              />
            </div>

            {/* Recent Issues */}
            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '1rem', color: '#1e293b' }}>
                Recent Issues
              </h3>
              <div className="issues-grid">
                {filteredIssues.slice(0, 3).map((issue) => (
                  <div 
                    key={issue._id || issue.id} 
                    className="issue-card"
                    onClick={() => navigate(`/issue/${issue._id || issue.id}`)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                      <div>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>
                          {issue.title}
                        </h4>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.3rem' }}>
                          📍 {issue.location?.name || issue.location}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                          Reported by: {issue.reportedBy?.name || 'Citizen'}
                        </div>
                    {issue.images && issue.images.length > 0 && (
                      <div style={{ marginBottom: '0.8rem', borderRadius: '8px', overflow: 'hidden', background: '#f8fafc' }}>
                        <img
                          alt={issue.title}
                          src={issue.images[0].url || issue.images[0].secure_url || issue.images[0].secureUrl}
                          style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                        />
                      </div>
                    )}

                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'end' }}>
                        {getStatusBadge(issue.status)}
                        {getPriorityBadge(issue.priority)}
                      </div>
                    </div>

                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>
                      {issue.description}
                    </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Assigned to: <strong>{issue.assignedTo?.name || 'Unassigned'}</strong>
                    {issue.resolved?.photo?.url && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#059669' }}>
                        ✓ Resolved with photo proof
                        <div style={{ marginTop: '0.3rem', height: 60, borderRadius: 4, overflow: 'hidden', background: '#f8fafc' }}>
                          <img 
                            src={issue.resolved.photo.url} 
                            alt="Resolution proof" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        </div>
                      </div>
                    )}
                  </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {issue.status === 'reported' && (
                          <button 
                            className="btn-secondary"
                            style={{ fontSize: '0.7rem', padding: '0.3rem 0.8rem' }}
                            onClick={async (e) => {
                              e.stopPropagation();
                              const employeeId = prompt('Enter Employee ID to assign (or leave empty for auto-assign):');
                              if (employeeId !== null) {
                                try {
                                  await apiService.assignIssue(issue._id || issue.id, { assignedTo: employeeId || null });
                                  toast.success('Issue assigned');
                                  const fresh = await apiService.getAdminDashboard();
                                  setStats(fresh.data || fresh);
                                } catch (err) {
                                  toast.error(`Assign failed: ${err.message}`);
                                }
                              }
                            }}
                          >
                            Assign
                          </button>
                        )}
                        {/* Admin can only assign issues, not resolve them */}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Issues Management */}
        {selectedView === 'issues' && (
          <>
            {/* Filters and Search */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1.5rem',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ position: 'relative' }}>
                  <Search 
                    size={16} 
                    style={{ 
                      position: 'absolute', 
                      left: '0.8rem', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      color: '#94a3b8'
                    }} 
                  />
                  <input
                    type="text"
                    placeholder="Search issues..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      padding: '0.6rem 0.8rem 0.6rem 2.5rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      minWidth: '300px'
                    }}
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    padding: '0.6rem 0.8rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    background: 'white'
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="reported">Reported</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  style={{
                    padding: '0.6rem 0.8rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    background: 'white'
                  }}
                >
                  <option value="all">All Categories</option>
                  <option>Road & Traffic</option>
                  <option>Water & Drainage</option>
                  <option>Electricity</option>
                  <option>Garbage & Sanitation</option>
                  <option>Street Lighting</option>
                  <option>Public Safety</option>
                  <option>Parks & Recreation</option>
                  <option>Other</option>
                </select>

                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value)}
                  style={{
                    padding: '0.6rem 0.8rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    background: 'white'
                  }}
                >
                  <option value="priority">Sort by Priority</option>
                  <option value="date">Sort by Date</option>
                </select>
              </div>

              <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                Showing {filteredIssues.length} of {(stats?.recentIssues || []).length} issues
              </div>
            </div>

            {/* Issues Table */}
            <div style={{ 
              background: 'white',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '0.8rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '600', color: '#374151' }}>Issue</th>
                    <th style={{ padding: '0.8rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '600', color: '#374151' }}>Location</th>
                    <th style={{ padding: '0.8rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '600', color: '#374151' }}>Status</th>
                    <th style={{ padding: '0.8rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '600', color: '#374151' }}>Priority</th>
                    <th style={{ padding: '0.8rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '600', color: '#374151' }}>Assigned To</th>
                    <th style={{ padding: '0.8rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: '600', color: '#374151' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIssues.map((issue) => (
                    <tr 
                      key={issue._id || issue.id}
                      style={{ 
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer'
                      }}
                      onClick={() => navigate(`/issue/${issue._id || issue.id}`)}
                    >
                      <td style={{ padding: '1rem 0.8rem' }}>
                        <div>
                          <div style={{ fontWeight: '500', color: '#1e293b', marginBottom: '0.2rem' }}>
                            {issue.title}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {issue.category}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 0.8rem', fontSize: '0.9rem', color: '#64748b' }}>
                        {issue.location?.name || ''}
                      </td>
                      <td style={{ padding: '1rem 0.8rem' }}>
                        {getStatusBadge(issue.status)}
                      </td>
                      <td style={{ padding: '1rem 0.8rem' }}>
                        {getPriorityBadge(issue.priority)}
                      </td>
                      <td style={{ padding: '1rem 0.8rem', fontSize: '0.9rem', color: '#64748b' }}>
                        {issue.assignedTo?.name || 'Unassigned'}
                      </td>
                      <td 
                        style={{ padding: '1rem 0.8rem' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          {issue.status === 'reported' && (
                            <button 
                              className="btn-secondary"
                              style={{ 
                                fontSize: '0.75rem', 
                                padding: '0.4rem 0.8rem',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                              onClick={async (e) => {
                                e.stopPropagation();
                                const employeeId = prompt('Enter Employee ID to assign or leave empty for auto-assign:');
                                if (employeeId !== null) {
                                  const trimmedId = employeeId.trim();
                                  
                                  // Validate input - just check it's not empty
                                  if (trimmedId !== '') {
                                    // Will be validated on backend
                                  }
                                  
                                  try {
                                    // Handle empty string as null for auto-assignment
                                    const assignData = trimmedId === '' ? { assignedTo: null } : { assignedTo: trimmedId };
                                    await apiService.assignIssue(issue._id || issue.id, assignData);
                                    toast.success('Issue assigned successfully');
                                    const fresh = await apiService.getAdminDashboard();
                                    setStats(fresh.data || fresh);
                                  } catch (err) {
                                    toast.error(`Assign failed: ${err.message}`);
                                  }
                                }
                              }}
                            >
                              Assign
                            </button>
                          )}
                          {/* Admin can only assign issues, not resolve them */}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Map View */}
        {selectedView === 'map' && (
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '1rem', color: '#1e293b' }}>
              Issues Map Overview
            </h3>
            <div style={{ 
              background: 'white',
              borderRadius: '12px',
              padding: '1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              marginBottom: '1rem'
            }}>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>
                📍 Map shows your current location and nearby issues. Click on markers to view details.
              </p>
            </div>
            <div style={{ height: '600px' }}>
              <IssueMap 
                issues={filteredIssues.map((iss) => ({
                  id: iss._id || iss.id,
                  title: iss.title,
                  location: iss.location?.name || '',
                  coordinates: iss.location?.coordinates ? [
                    iss.location.coordinates.latitude,
                    iss.location.coordinates.longitude
                  ] : null,
                  status: iss.status,
                  upvotes: iss.upvotedBy?.length || iss.upvotes || 0,
                  description: iss.description,
                  category: iss.category,
                  priority: iss.priority
                })).filter(i => Array.isArray(i.coordinates) && i.coordinates.length === 2)}
                onMarkerClick={(issue) => navigate(`/issue/${issue.id}`)}
                showCenterMarker={true}
              />
            </div>
          </div>
        )}

        {/* Employees Management */}
        {selectedView === 'employees' && <EmployeeManagement />}

        {/* Analytics */}
        {selectedView === 'analytics' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                Civic Intelligence & Analytics Portal
              </h3>
              <span style={{ fontSize: '0.85rem', color: '#64748b', background: '#e2e8f0', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontWeight: '600' }}>
                Powered by Gemini 2.5 Flash ✨
              </span>
            </div>

            {/* Sub Tabs */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              marginBottom: '2rem',
              background: '#f1f5f9',
              padding: '0.4rem',
              borderRadius: '12px',
              width: 'fit-content'
            }}>
              {[
                { key: 'charts', label: 'Traditional Metrics & Charts', icon: BarChart3 },
                { key: 'civic', label: 'AI Civic Insights', icon: TrendingUp },
                { key: 'predictive', label: 'AI Predictive Risk Map', icon: AlertTriangle },
                { key: 'governance', label: 'AI Executive Governance', icon: Users }
              ].map(sub => (
                <button
                  key={sub.key}
                  onClick={() => setAiTab(sub.key)}
                  style={{
                    background: aiTab === sub.key ? 'white' : 'transparent',
                    color: aiTab === sub.key ? '#1e4359' : '#64748b',
                    border: 'none',
                    padding: '0.6rem 1.2rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    boxShadow: aiTab === sub.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <sub.icon size={14} />
                  {sub.label}
                </button>
              ))}
            </div>

            {/* Loading Indicator */}
            {loadingAi ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '400px',
                background: 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(4px)',
                borderRadius: '16px',
                border: '1px solid rgba(226, 232, 240, 0.8)'
              }}>
                <div style={{
                  width: '35px',
                  height: '35px',
                  border: '3px solid rgba(30, 67, 89, 0.1)',
                  borderTop: '3px solid #1e4359',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  marginBottom: '1rem'
                }}></div>
                <span style={{ color: '#1e4359', fontWeight: '600', fontSize: '0.95rem' }}>
                  Gemini AI compiling smart city insights...
                </span>
              </div>
            ) : (
              <>
                {/* Traditional Charts */}
                {aiTab === 'charts' && <ResolutionCharts />}

                {/* AI Civic Insights */}
                {aiTab === 'civic' && civicInsights && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Insights top summary cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                      <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#2563eb', letterSpacing: '0.05em' }}>Most Active Issue Category</span>
                        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1e293b', marginTop: '0.5rem' }}>
                          🔥 {civicInsights.most_common_issue_type || 'Road Damage'}
                        </div>
                      </div>
                      <div style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#dc2626', letterSpacing: '0.05em' }}>High Risk Hotspots</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                          {(civicInsights.complaint_hotspots || []).map((hotspot, idx) => (
                            <span key={idx} style={{ background: 'white', border: '1px solid #fee2e2', color: '#991b1b', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600' }}>
                              📍 {hotspot}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                      {/* Left: Performance Details */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                          <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            📈 Resolution & SLA Trends
                          </h4>
                          <p style={{ margin: 0, fontSize: '0.925rem', color: '#475569', lineHeight: '1.6' }}>
                            {civicInsights.resolution_trends}
                          </p>
                        </div>
                        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                          <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            🏢 Departmental Analysis
                          </h4>
                          <p style={{ margin: 0, fontSize: '0.925rem', color: '#475569', lineHeight: '1.6' }}>
                            {civicInsights.department_performance}
                          </p>
                        </div>
                      </div>

                      {/* Right: Recommendations & Concerns */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                          <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            ⚠️ Emerging Concerns
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {(civicInsights.emerging_civic_concerns || []).map((concern, idx) => (
                              <div key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'start', fontSize: '0.9rem', color: '#334155' }}>
                                <span style={{ color: '#f59e0b' }}>⚡</span>
                                <span style={{ lineHeight: '1.4' }}>{concern}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div style={{ background: 'linear-gradient(135deg, #1e4359 0%, #102a3a 100%)', padding: '1.5rem', borderRadius: '16px', color: 'white' }}>
                          <h4 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            ✨ Proactive Preventive Recommendations
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {(civicInsights.preventive_recommendations || []).map((rec, idx) => (
                              <div key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'start', fontSize: '0.9rem', color: '#e2e8f0' }}>
                                <span style={{ color: '#38bdf8' }}>✓</span>
                                <span style={{ lineHeight: '1.4' }}>{rec}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Predictive Risk Map & Hotspots */}
                {aiTab === 'predictive' && predictiveInsights && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1e293b', marginBottom: '1rem' }}>
                        🔮 Early Intervention Risk Heatmap
                      </h4>
                      <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1.5rem' }}>
                        These zones represent locations with high frequencies of recurring complaints or infrastructure wear detected dynamically by Gemini AI analysis.
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {(predictiveInsights.recurring_risk_zones || []).map((zone, idx) => (
                          <div key={idx} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '1rem 1.25rem',
                            borderRadius: '12px',
                            background: zone.risk === 'High' ? '#fef2f2' : zone.risk === 'Medium' ? '#fff7ed' : '#f0fdf4',
                            border: `1px solid ${zone.risk === 'High' ? '#fecaca' : zone.risk === 'Medium' ? '#fed7aa' : '#bbf7d0'}`,
                          }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '1rem' }}>📍 {zone.location}</span>
                              <span style={{ fontSize: '0.85rem', color: '#475569' }}>{zone.reason}</span>
                            </div>
                            <span style={{
                              background: zone.risk === 'High' ? '#ef4444' : zone.risk === 'Medium' ? '#f59e0b' : '#10b981',
                              color: 'white',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              textTransform: 'uppercase'
                            }}>{zone.risk} Risk</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', marginBottom: '1rem' }}>
                          🪵 Infrastructure Nodes Requiring Replacement
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {(predictiveInsights.damaged_infrastructure || []).map((node, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.9rem', color: '#334155' }}>
                              <span style={{ color: '#ef4444' }}>🔧</span>
                              <span>{node}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', marginBottom: '1rem' }}>
                          📅 Seasonal Trends & Forecasts
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {(predictiveInsights.seasonal_trends || []).map((trend, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.9rem', color: '#334155' }}>
                              <span style={{ color: '#3b82f6' }}>⛈️</span>
                              <span>{trend}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', padding: '1.5rem', borderRadius: '16px', color: 'white' }}>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem' }}>
                        🛡️ Proactive Municipal Interventions
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {(predictiveInsights.proactive_interventions || []).map((action, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'start', fontSize: '0.9rem', color: '#d1fae5' }}>
                            <span style={{ color: '#a7f3d0' }}>✦</span>
                            <span style={{ lineHeight: '1.4' }}>{action}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Executive Governance Report */}
                {aiTab === 'governance' && executiveGovernance && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Public Engagement & Efficiency Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Resolution Efficiency</span>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.925rem', color: '#334155', lineHeight: '1.5' }}>
                          {executiveGovernance.resolution_efficiency}
                        </p>
                      </div>
                      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Citizen Trust & Engagement</span>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.925rem', color: '#334155', lineHeight: '1.5' }}>
                          {executiveGovernance.citizen_engagement}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                      {/* Left: Ward Performance Table */}
                      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', marginBottom: '1rem' }}>
                          📊 Ward Performance & Efficiency
                        </h4>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                                <th style={{ padding: '0.5rem', fontSize: '0.8rem', color: '#475569' }}>Ward Name</th>
                                <th style={{ padding: '0.5rem', fontSize: '0.8rem', color: '#475569' }}>Efficiency</th>
                                <th style={{ padding: '0.5rem', fontSize: '0.8rem', color: '#475569' }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(executiveGovernance.ward_performance || []).map((w, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>{w.ward}</td>
                                  <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.875rem' }}>{w.efficiency}</td>
                                  <td style={{ padding: '0.75rem 0.5rem' }}>
                                    <span style={{
                                      background: w.status === 'Good' ? '#dcfce7' : w.status === 'Average' ? '#fef3c7' : '#fee2e2',
                                      color: w.status === 'Good' ? '#15803d' : w.status === 'Average' ? '#b45309' : '#b91c1c',
                                      padding: '0.2rem 0.5rem',
                                      borderRadius: '6px',
                                      fontSize: '0.75rem',
                                      fontWeight: '600'
                                    }}>{w.status}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Right: Departmental Backlogs & Metrics */}
                      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b', marginBottom: '1rem' }}>
                          🏢 Departmental Performance Metrics
                        </h4>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                                <th style={{ padding: '0.5rem', fontSize: '0.8rem', color: '#475569' }}>Department</th>
                                <th style={{ padding: '0.5rem', fontSize: '0.8rem', color: '#475569' }}>Resolved</th>
                                <th style={{ padding: '0.5rem', fontSize: '0.8rem', color: '#475569' }}>Pending</th>
                                <th style={{ padding: '0.5rem', fontSize: '0.8rem', color: '#475569' }}>Avg. Time</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(executiveGovernance.department_performance || []).map((dept, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>{dept.name}</td>
                                  <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.875rem', color: '#15803d', fontWeight: '600' }}>{dept.resolved}</td>
                                  <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.875rem', color: '#dc2626', fontWeight: '600' }}>{dept.pending}</td>
                                  <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.875rem', color: '#64748b' }}>{dept.avgTime}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Executive Governance Policy/Administrative recommendations */}
                    <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', padding: '1.5rem', borderRadius: '16px', color: 'white' }}>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '1rem' }}>
                        🏛️ Executive Policy & Resource Allocation Recommendations
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {(executiveGovernance.ai_recommendations || []).map((rec, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'start', fontSize: '0.9rem', color: '#ede9fe' }}>
                            <span style={{ color: '#ddd6fe' }}>★</span>
                            <span style={{ lineHeight: '1.4' }}>{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Employee Management Component
const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    employeeId: '',
    password: '',
    role: 'field-staff',
    departments: [],
    email: '',
    mobile: ''
  });

  const departments = [
    'Road & Traffic',
    'Water & Drainage',
    'Electricity',
    'Garbage & Sanitation',
    'Street Lighting',
    'Public Safety',
    'Parks & Recreation',
    'All',
    'Other'
  ];

  const roles = [
    { value: 'field-staff', label: 'Field Staff' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'commissioner', label: 'Commissioner' }
  ];

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await apiService.getEmployees({ limit: 100 });
      setEmployees(response.data?.employees || []);
    } catch (error) {
      toast.error(`Failed to load employees: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await apiService.createEmployee(formData);
      toast.success('Employee created successfully');
      setShowCreateForm(false);
      resetForm();
      fetchEmployees();
    } catch (error) {
      toast.error(`Failed to create employee: ${error.message}`);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await apiService.updateEmployee(editingEmployee.employeeId, formData);
      toast.success('Employee updated successfully');
      setEditingEmployee(null);
      resetForm();
      fetchEmployees();
    } catch (error) {
      toast.error(`Failed to update employee: ${error.message}`);
    }
  };

  const handleDelete = async (employeeId) => {
    if (!window.confirm('Are you sure you want to deactivate this employee?')) return;
    try {
      await apiService.deleteEmployee(employeeId);
      toast.success('Employee deactivated successfully');
      fetchEmployees();
    } catch (error) {
      toast.error(`Failed to delete employee: ${error.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      employeeId: '',
      password: '',
      role: 'field-staff',
      departments: [],
      email: '',
      mobile: ''
    });
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name || '',
      employeeId: employee.employeeId || '',
      password: '',
      role: employee.role || 'field-staff',
      departments: employee.departments || (employee.department ? [employee.department] : []),
      email: employee.email || '',
      mobile: employee.mobile || ''
    });
    setShowCreateForm(true);
  };

  const toggleDepartment = (dept) => {
    setFormData(prev => ({
      ...prev,
      departments: prev.departments.includes(dept)
        ? prev.departments.filter(d => d !== dept)
        : [...prev.departments, dept]
    }));
  };

  const getRoleBadge = (role) => {
    const config = {
      'field-staff': { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Field Staff' },
      'supervisor': { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Supervisor' },
      'commissioner': { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Commissioner' },
      'employee': { bg: 'bg-gray-50', text: 'text-gray-700', label: 'Employee' }
    };
    const c = config[role] || config['employee'];
    return (
      <span className={`${c.bg} ${c.text} px-2 py-1 rounded-full text-xs font-medium`}>
        {c.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
        <p style={{ marginTop: '1rem', color: '#64748b' }}>Loading employees...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#1e293b' }}>
          Employee Management
        </h3>
        <button
          onClick={() => {
            resetForm();
            setEditingEmployee(null);
            setShowCreateForm(!showCreateForm);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <UserPlus size={16} />
          {showCreateForm ? 'Cancel' : 'Create Employee'}
        </button>
      </div>

      {showCreateForm && (
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '12px',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h4 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1.5rem', color: '#1e293b' }}>
            {editingEmployee ? 'Edit Employee' : 'Create New Employee'}
          </h4>
          <form onSubmit={editingEmployee ? handleUpdate : handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID *</label>
                <input
                  type="text"
                  required
                  disabled={!!editingEmployee}
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {!editingEmployee && '*'}
                </label>
                <input
                  type="password"
                  required={!editingEmployee}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={editingEmployee ? 'Leave blank to keep current' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {roles.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                <input
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label className="block text-sm font-medium text-gray-700 mb-2">Departments * (Select one or more)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {departments.map(dept => (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => toggleDepartment(dept)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      formData.departments.includes(dept)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Save size={16} />
                {editingEmployee ? 'Update Employee' : 'Create Employee'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                  setEditingEmployee(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <X size={16} />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{
        background: 'white',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#1e293b' }}>Employee ID</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#1e293b' }}>Name</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#1e293b' }}>Role</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#1e293b' }}>Departments</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#1e293b' }}>Email</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#1e293b' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#1e293b' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    No employees found. Create your first employee to get started.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#1e293b' }}>{emp.employeeId}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#1e293b' }}>{emp.name}</td>
                    <td style={{ padding: '1rem' }}>{getRoleBadge(emp.role)}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
                      {(emp.departments || (emp.department ? [emp.department] : [])).join(', ') || 'N/A'}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b' }}>{emp.email || 'N/A'}</td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        emp.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {emp.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleEdit(emp)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(emp.employeeId)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Deactivate"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;