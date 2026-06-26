import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'sonner';
import { useNavigate, useParams } from 'react-router-dom';
import { LanguageContext } from '../App';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  User, 
  ThumbsUp, 
  MessageCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
  Settings
} from 'lucide-react';
import IssueMap from './IssueMap';
import apiService from '../services/api';

const IssueDetail = ({ user, isAdmin }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useContext(LanguageContext);
  const [issue, setIssue] = useState(null);
  const [isUpvoted, setIsUpvoted] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Verification States
  const [verificationStatus, setVerificationStatus] = useState('verified'); // verified | rejected
  const [verificationComment, setVerificationComment] = useState('');
  const [verificationEvidence, setVerificationEvidence] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    setIsVerifying(true);
    try {
      let evidenceUrl = '';
      if (verificationEvidence) {
        try {
          const uploadResponse = await apiService.uploadImage(verificationEvidence);
          const uploaded = uploadResponse?.data || uploadResponse || {};
          evidenceUrl = uploaded.url || uploaded.secure_url || '';
        } catch (uploadError) {
          console.warn('Evidence upload failed, continuing without evidence:', uploadError);
        }
      }

      const verifyResponse = await apiService.verifyIssue(id, {
        status: verificationStatus,
        comment: verificationComment,
        evidenceUrl
      });

      if (verifyResponse.success) {
        toast.success(`Verification submitted! Awarded ${verifyResponse.data?.pointsAwarded || 5} points.`);
        setVerificationComment('');
        setVerificationEvidence(null);
        const fileInput = document.getElementById('evidenceInput');
        if (fileInput) fileInput.value = '';
        fetchIssueData();
      }
    } catch (error) {
      console.error('Error verifying issue:', error);
      toast.error('Failed to submit verification.');
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    fetchIssueData();
  }, [id]);

  const fetchIssueData = async () => {
    setIsLoading(true);
    try {
      const issueResponse = await apiService.getIssueById(id);
      const rawIssue = issueResponse.data?.issue || issueResponse.issue || issueResponse;
      if (!rawIssue) throw new Error('Issue not found');

      const firstImage = Array.isArray(rawIssue.images) && rawIssue.images.length > 0 ? rawIssue.images[0] : null;
      const imageUrl = (firstImage && (firstImage.url || firstImage.secure_url || firstImage.secureUrl || (typeof firstImage === 'string' ? firstImage : null))) || rawIssue.image || rawIssue.imageUrl || null;

      const getStringValue = (value) => {
        if (!value) return null;
        if (typeof value === 'string') return value;
        if (typeof value === 'object') {
          if (value.name) return value.name;
          if (value._id) return String(value._id);
          return null;
        }
        return String(value);
      };

      const mappedIssue = {
        id: rawIssue._id || rawIssue.id,
        title: rawIssue.title,
        description: rawIssue.description,
        location: rawIssue.location?.name || (typeof rawIssue.location === 'string' ? rawIssue.location : 'Location not specified'),
        coordinates: rawIssue.location?.coordinates ?
          [rawIssue.location.coordinates.latitude, rawIssue.location.coordinates.longitude] :
          [16.0716, 77.9053],
        status: rawIssue.status || 'reported',
        upvotes: rawIssue.upvotedBy?.length || rawIssue.upvotes || 0,
        category: rawIssue.category || 'General',
        priority: rawIssue.priority || 'medium',
        assignedTo: getStringValue(rawIssue.assignedTo) || 'Unassigned',
        reportedBy: getStringValue(rawIssue.reportedBy) || 'Citizen',
        timestamp: rawIssue.createdAt || rawIssue.timestamp,
        image: imageUrl,
        verificationSummary: rawIssue.verificationSummary || null,
        verifications: rawIssue.verifications || [],
        aiResolution: rawIssue.aiResolution || null
      };

      setIssue(mappedIssue);

      try {
        const commentsResponse = await apiService.getComments(id);
        setComments(commentsResponse.data?.comments || commentsResponse.comments || []);
      } catch (commentsError) {
        console.warn('Comments fetch failed, continuing without comments:', commentsError);
        setComments([]);
      }
    } catch (error) {
      console.error('Error fetching issue data:', error);
      try {
        const mockIssues = {
          '1': {
            id: '1',
            title: 'Broken Street Light',
            location: 'MG Road, Bhopal',
            coordinates: [23.2599, 77.4126],
            status: 'reported',
            upvotes: 15,
            description: 'Street light pole is broken and hanging dangerously. This has been causing safety concerns especially during night time. Multiple citizens have complained about this issue.',
            category: 'Street Lighting',
            priority: 'high',
            assignedTo: 'Unassigned',
            reportedBy: 'Citizen #1234',
            timestamp: '2025-01-18T10:30:00Z',
            image: null
          },
          '2': {
            id: '2',
            title: 'Pothole on Main Road',
            location: 'DB City Mall Road',
            coordinates: [23.2456, 77.4200],
            status: 'in-progress',
            upvotes: 28,
            description: 'Large pothole causing traffic issues and vehicle damage. The pothole is approximately 3 feet in diameter and 6 inches deep.',
            category: 'Road & Traffic',
            priority: 'medium',
            assignedTo: 'Ward Officer A',
            reportedBy: 'Citizen #5678',
            timestamp: '2025-01-15T14:20:00Z',
            image: null
          },
          'user_1': {
            id: 'user_1',
            title: 'Broken Street Light',
            location: 'Near my house, MG Road',
            coordinates: [23.2599, 77.4126],
            status: 'in-progress',
            upvotes: 12,
            description: 'Street light pole is broken and hanging dangerously',
            category: 'Street Lighting',
            priority: 'high',
            assignedTo: 'Electrical Department',
            reportedBy: user?.name || 'User',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            image: null
          }
        };

        const foundIssue = mockIssues[id];
        if (foundIssue) {
          setIssue(foundIssue);
        }

        setComments([
          {
            id: 1,
            author: 'Citizen #5432',
            content: 'This is a serious safety hazard. Please prioritize this issue.',
            timestamp: '2025-01-18T14:30:00Z',
            isAdmin: false
          },
          {
            id: 2,
            author: 'Ward Officer',
            content: 'Issue has been acknowledged. We will dispatch a team tomorrow.',
            timestamp: '2025-01-18T16:45:00Z',
            isAdmin: true
          }
        ]);
      } catch (mockError) {
        console.error('Error loading mock data:', mockError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpvote = async () => {
    try {
      const togglingToUpvoted = !isUpvoted;
      setIsUpvoted(togglingToUpvoted);
      setIssue(prev => ({ ...prev, upvotes: prev.upvotes + (togglingToUpvoted ? 1 : -1) }));

      if (togglingToUpvoted) {
        await apiService.upvoteIssue(id);
      } else {
        await apiService.removeUpvote(id);
      }
    } catch (error) {
      console.error('Error toggling upvote:', error);
      setIsUpvoted(prev => !prev);
      setIssue(prev => ({ ...prev, upvotes: prev.upvotes + (isUpvoted ? 1 : -1) }));
      toast.error('Failed to update upvote. Please try again.');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const commentData = {
        content: newComment,
        userId: user?.id,
        author: isAdmin ? 'Admin User' : user?.name || 'User',
        isAdmin: isAdmin
      };

      const response = await apiService.addComment(id, commentData);
      setComments(prev => [...prev, response]);
      setNewComment('');
      toast.success('Comment added successfully');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment. Please try again.');
    }
  };

  const handleStatusUpdate = (newStatus) => {
    setIssue(prev => ({ ...prev, status: newStatus }));
    toast.success(`Issue status updated to ${newStatus}`);
  };

  const handleAssign = () => {
    const officer = prompt('Assign to officer:');
    if (officer) {
      setIssue(prev => ({ ...prev, assignedTo: officer, status: 'in-progress' }));
      toast.success(`Issue assigned to ${officer}`);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'reported': { bg: 'bg-red-50', text: 'text-red-700', label: 'REPORTED' },
      'in-progress': { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'IN PROGRESS' },
      'resolved': { bg: 'bg-green-50', text: 'text-green-700', label: 'RESOLVED' },
      'closed': { bg: 'bg-gray-50', text: 'text-gray-700', label: 'CLOSED' }
    };
    const config = statusConfig[status] || statusConfig['reported'];
    return (
      <span className={`${config.bg} ${config.text} px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide`}>
        {config.label}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      'urgent': { bg: 'bg-red-50', text: 'text-red-700', label: 'URGENT' },
      'high': { bg: 'bg-red-50', text: 'text-red-700', label: 'High Priority' },
      'medium': { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Medium Priority' },
      'low': { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Low Priority' }
    };
    const config = priorityConfig[priority] || priorityConfig['medium'];
    return (
      <span className={`${config.bg} ${config.text} px-2.5 py-1 rounded-full text-xs font-medium ml-2`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeSince = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const [lat, lng] = issue.coordinates || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => {
                  if (isAdmin) {
                    navigate('/admin');
                  } else if (user?.role === 'field-staff' || user?.role === 'supervisor' || user?.role === 'commissioner' || user?.role === 'employee') {
                    navigate('/employee');
                  } else {
                    navigate('/citizen');
                  }
                }}
                className="mr-3 p-1 text-gray-700 hover:text-gray-900"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-xl font-bold text-gray-900">Issue Details</h1>
            </div>

            {isAdmin && (
              <div className="flex gap-2">
                {issue.status === 'reported' && (
                  <button
                    onClick={handleAssign}
                    className="px-4 py-2 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    Assign Officer
                  </button>
                )}
                {issue.status === 'in-progress' && (
                  <button
                    onClick={() => handleStatusUpdate('resolved')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Mark Resolved
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-6xl mx-auto">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
          <div className="flex justify-between items-start mb-4 gap-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                {issue.title}
              </h2>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {getStatusBadge(issue.status)}
                {getPriorityBadge(issue.priority)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-gray-400" />
                  <span>{typeof issue.location === 'string' ? issue.location : (issue.location?.name || 'Location not specified')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-gray-400" />
                  <span>{formatDate(issue.timestamp)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User size={16} className="text-gray-400" />
                  <span>Reported by: {typeof issue.reportedBy === 'string' ? issue.reportedBy : (issue.reportedBy?.name || 'Anonymous')}</span>
                </div>
                {issue.assignedTo && issue.assignedTo !== 'Unassigned' && (
                  <div className="flex items-center gap-2">
                    <Settings size={16} className="text-gray-400" />
                    <span>Assigned to: {typeof issue.assignedTo === 'string' ? issue.assignedTo : (issue.assignedTo?.name || 'Unassigned')}</span>
                  </div>
                )}
              </div>

              {lat && lng && (
                <div className="text-sm text-gray-500 mb-4">
                  <span>Lat: {lat.toFixed(4)}, Lng: {lng.toFixed(4)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="text-sm font-medium text-gray-900">Category: </span>
              <span className="text-sm text-gray-600">{typeof issue.category === 'string' ? issue.category : (issue.category?.name || 'General')}</span>
            </div>
            {issue.verificationSummary && (
              <span style={{
                fontSize: '0.75rem',
                fontWeight: '700',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                background: issue.verificationSummary.status === 'Verified' ? '#dcfce7' :
                            issue.verificationSummary.status === 'Rejected' ? '#fee2e2' : '#fff7ed',
                color: issue.verificationSummary.status === 'Verified' ? '#15803d' :
                       issue.verificationSummary.status === 'Rejected' ? '#b91c1c' : '#c2410c'
              }}>
                🛡️ AI STATUS: {issue.verificationSummary.status} ({issue.verificationSummary.confidenceScore}%)
              </span>
            )}
          </div>

          {/* Community Verification Summary Card */}
          {issue.verificationSummary && (
            <div style={{
              background: issue.verificationSummary.status === 'Verified' ? '#f0fdf4' :
                          issue.verificationSummary.status === 'Rejected' ? '#fef2f2' :
                          issue.verificationSummary.status === 'Contested' ? '#fff7ed' : '#f8fafc',
              border: `1px solid ${
                issue.verificationSummary.status === 'Verified' ? '#bbf7d0' :
                issue.verificationSummary.status === 'Rejected' ? '#fecaca' :
                issue.verificationSummary.status === 'Contested' ? '#fed7aa' : '#cbd5e1'
              }`,
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: issue.verificationSummary.status === 'Verified' ? '#166534' :
                         issue.verificationSummary.status === 'Rejected' ? '#991b1b' :
                         issue.verificationSummary.status === 'Contested' ? '#9a3412' : '#475569'
                }}>
                  🛡️ Community Verification Consensus
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>
                  Confidence Score: {issue.verificationSummary.confidenceScore}%
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: '1.5' }}>
                {issue.verificationSummary.summary}
              </p>
            </div>
          )}

          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Description</h3>
            <p className="text-gray-600 leading-relaxed">
              {issue.description}
            </p>
          </div>

          {issue.image && (
            <div className="mb-4">
              <h3 className="text-base font-semibold text-gray-900 mb-2">Evidence</h3>
              <div className="rounded-lg overflow-hidden max-w-2xl">
                <img
                  src={issue.image}
                  alt="Issue evidence"
                  className="w-full h-auto object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            </div>
          )}

          {issue.status === 'resolved' && issue.aiResolution && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              marginTop: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#15803d', fontWeight: '700', marginBottom: '0.75rem' }}>
                ✨ AI Resolution Report (Citizen Version)
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#166534', margin: '0 0 0.5rem 0' }}>
                {issue.aiResolution.summary}
              </h4>
              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.925rem', color: '#1e3f20', lineHeight: '1.5' }}>
                {issue.aiResolution.explanation}
              </p>
              <div style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: '600', background: '#dcfce7', padding: '0.5rem 0.75rem', borderRadius: '8px', display: 'inline-block' }}>
                🌱 Impact: {issue.aiResolution.impactStatement}
              </div>
            </div>
          )}

          {!isAdmin && (
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              {issue.status === 'resolved' && user && (
                <button
                  onClick={async () => {
                    if (window.confirm('Are you satisfied with the resolution? This will close the issue.')) {
                      try {
                        await apiService.closeIssue(issue.id);
                        toast.success('Issue closed successfully');
                        navigate('/citizen');
                      } catch (error) {
                        console.error('Error closing issue:', error);
                        toast.error('Failed to close issue. Please try again.');
                      }
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <CheckCircle size={16} />
                  Acknowledge & Close Issue
                </button>
              )}
              {issue.status !== 'resolved' && (
                <>
                  <button
                    onClick={handleUpvote}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      isUpvoted
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <ThumbsUp size={16} />
                    {issue.upvotes} {isUpvoted ? 'Upvoted' : 'Upvote'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
          <div className="h-64 rounded-lg overflow-hidden">
            <IssueMap
              issues={[issue]}
              center={issue.coordinates}
              showCenterMarker={false}
              onMarkerClick={() => {}}
            />
          </div>
        </div>

        {/* Verification Submission Form Panel */}
        {!isAdmin && issue.status !== 'resolved' && issue.status !== 'closed' && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Community Verification Engine</h3>
            <p className="text-sm text-gray-600 mb-4">
              Is this issue active and accurately described? Help confirm its validity. Nearby verifications increase the issue validation score.
            </p>
            
            <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem',
                  border: `2px solid ${verificationStatus === 'verified' ? '#10b981' : '#cbd5e1'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: verificationStatus === 'verified' ? '#ecfdf5' : 'transparent',
                  color: verificationStatus === 'verified' ? '#047857' : '#64748b',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}>
                  <input
                    type="radio"
                    name="verificationStatus"
                    value="verified"
                    checked={verificationStatus === 'verified'}
                    onChange={() => setVerificationStatus('verified')}
                    style={{ display: 'none' }}
                  />
                  ✅ Verify Issue Active
                </label>
                
                <label style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem',
                  border: `2px solid ${verificationStatus === 'rejected' ? '#ef4444' : '#cbd5e1'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: verificationStatus === 'rejected' ? '#fef2f2' : 'transparent',
                  color: verificationStatus === 'rejected' ? '#b91c1c' : '#64748b',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}>
                  <input
                    type="radio"
                    name="verificationStatus"
                    value="rejected"
                    checked={verificationStatus === 'rejected'}
                    onChange={() => setVerificationStatus('rejected')}
                    style={{ display: 'none' }}
                  />
                  ❌ Reject Issue / Resolved
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Verification Comment</label>
                <textarea
                  value={verificationComment}
                  onChange={(e) => setVerificationComment(e.target.value)}
                  placeholder="Provide details about what you see at this location..."
                  rows="3"
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Evidence Photo (Optional)</label>
                <input
                  id="evidenceInput"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setVerificationEvidence(e.target.files[0])}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                style={{ background: '#1e4359', color: 'white', border: 'none', cursor: 'pointer' }}
              >
                {isVerifying ? 'Submitting Verification...' : 'Submit Verification (+5 Points)'}
              </button>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress Timeline</h3>
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex flex-col items-center gap-2 text-xs">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                issue.status === 'reported' || issue.status === 'in-progress' || issue.status === 'resolved'
                  ? 'bg-green-500' : 'bg-gray-300'
              }`}>
                <AlertTriangle size={16} className="text-white" />
              </div>
              <span className={`font-medium ${
                issue.status === 'reported' || issue.status === 'in-progress' || issue.status === 'resolved'
                  ? 'text-green-600' : 'text-gray-400'
              }`}>Reported</span>
            </div>
            
            <div className={`flex-1 h-1 rounded ${
              issue.status === 'in-progress' || issue.status === 'resolved' ? 'bg-green-500' : 'bg-gray-300'
            }`}></div>
            
            <div className="flex flex-col items-center gap-2 text-xs">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                issue.status === 'in-progress' || issue.status === 'resolved'
                  ? 'bg-blue-500' : 'bg-gray-300'
              }`}>
                <Clock size={16} className="text-white" />
              </div>
              <span className={`font-medium ${
                issue.status === 'in-progress' || issue.status === 'resolved'
                  ? 'text-blue-600' : 'text-gray-400'
              }`}>In Progress</span>
            </div>
            
            <div className={`flex-1 h-1 rounded ${
              issue.status === 'resolved' ? 'bg-green-500' : 'bg-gray-300'
            }`}></div>
            
            <div className="flex flex-col items-center gap-2 text-xs">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                issue.status === 'resolved' ? 'bg-green-500' : 'bg-gray-300'
              }`}>
                <CheckCircle size={16} className="text-white" />
              </div>
              <span className={`font-medium ${
                issue.status === 'resolved' ? 'text-green-600' : 'text-gray-400'
              }`}>Resolved</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Comments & Updates</h3>

          <form onSubmit={handleAddComment} className="mb-6">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment or update..."
              className="w-full p-4 border border-gray-300 rounded-lg text-sm min-h-[100px] resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Comment
            </button>
          </form>

          <div className="flex flex-col gap-3">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className={`p-4 rounded-lg border-l-4 ${
                  comment.isAdmin
                    ? 'bg-blue-50 border-blue-500'
                    : 'bg-gray-50 border-gray-300'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <strong className="text-sm font-semibold text-gray-900">
                      {comment.author}
                    </strong>
                    {comment.isAdmin && (
                      <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-xs font-medium">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {getTimeSince(comment.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {comment.content}
                </p>
              </div>
            ))}
            
            {comments.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm">
                No comments yet. Be the first to comment!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IssueDetail;
