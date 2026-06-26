import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';

const Leaderboard = ({ hideBackButton = false }) => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiService.getLeaderboard(100);
        // Handle both direct response and nested data structure
        const responseData = response?.data || response;
        const leaderboard = responseData?.leaderboard || [];
        const userData = responseData?.currentUser || null;
        
        // Ensure we have valid array data
        const validLeaderboard = Array.isArray(leaderboard) ? leaderboard : [];
        
        // Sort by rank to ensure stable ordering
        validLeaderboard.sort((a, b) => {
          if (a.rank !== b.rank) {
            return a.rank - b.rank;
          }
          // If ranks are equal, sort by points descending, then by name
          if (a.points !== b.points) {
            return b.points - a.points;
          }
          return (a.name || '').localeCompare(b.name || '');
        });
        
        setEntries(validLeaderboard);
        setCurrentUser(userData);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setError(err.message || 'Failed to load leaderboard');
        setEntries([]);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);
  
  // Memoize the display entries to prevent unnecessary re-renders
  const displayEntries = useMemo(() => {
    return entries.slice(0, 100); // Show top 100
  }, [entries]);

  return (
    <div className="form-container" style={{ paddingBottom: '80px' }}>
      <div className="form-card" style={{ maxWidth: 700 }}>
        <h1 style={{ marginBottom: '1rem' }}>🏆 Leaderboard</h1>
        <p style={{ color: '#64748b', marginBottom: '1.5rem', lineHeight: '1.6' }}>
          Top contributors ranked by total contribution score. Earn points by reporting issues, supporting issues, and having your issues resolved.
        </p>
               {/* Points Breakdown */}
        <div style={{ 
          background: '#f8fafc', 
          padding: '1.25rem', 
          borderRadius: 12, 
          marginBottom: '1.5rem',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b', marginBottom: '0.5rem' }}>
            Contribution Point System:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.825rem', color: '#475569' }}>
            <div>
              <strong>Earn Points:</strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
                <span>• Report Issue: <strong>+10 pts</strong></span>
                <span>• Verify Issue: <strong>+5 pts</strong></span>
                <span>• Support Issue: <strong>+3 pts</strong></span>
                <span>• Consensus validation: <strong>+5 pts</strong></span>
                <span>• Confirmed Resolution: <strong>+10 pts</strong></span>
              </div>
            </div>
            <div>
              <strong>Badges & Levels:</strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
                <span>🌱 Novice: <strong>&lt; 10 pts</strong></span>
                <span>🤝 Community Helper: <strong>10 pts</strong></span>
                <span>🏆 Civic Champion: <strong>50 pts</strong></span>
                <span>🛡️ Civic Guardian: <strong>100 pts</strong></span>
                <span>🦸 Community Hero: <strong>200+ pts</strong></span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Current User Info */}
        {currentUser && (
          <div style={{ 
            background: '#e0f2fe', 
            padding: '1rem', 
            borderRadius: 12, 
            marginBottom: '1.5rem',
            border: '2px solid #0ea5e9'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.25rem' }}>Your Rank</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>
                    #{currentUser.rank}
                  </span>
                  {(() => {
                    const badge = currentUser.points >= 200 ? { label: 'Community Hero', icon: '🦸' } :
                                  currentUser.points >= 100 ? { label: 'Civic Guardian', icon: '🛡️' } :
                                  currentUser.points >= 50 ? { label: 'Civic Champion', icon: '🏆' } :
                                  currentUser.points >= 10 ? { label: 'Community Helper', icon: '🤝' } :
                                  { label: 'Novice', icon: '🌱' };
                    return (
                      <span style={{ fontSize: '0.8rem', background: 'white', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: '600' }}>
                        {badge.icon} {badge.label}
                      </span>
                    );
                  })()}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.25rem' }}>Your Points</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>
                  {currentUser.points || 0} pts
                </div>
              </div>
            </div>
          </div>
        )}
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ color: '#64748b', marginBottom: '0.5rem' }}>Loading leaderboard...</div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Fetching latest scores...</div>
          </div>
        ) : error ? (
          <div style={{ 
            background: '#fef2f2', 
            padding: '1rem', 
            borderRadius: 12, 
            border: '1px solid #fecaca',
            color: '#dc2626',
            textAlign: 'center'
          }}>
            {error}
          </div>
        ) : displayEntries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: '#64748b', marginBottom: '0.5rem' }}>No leaderboard data available.</p>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Start reporting issues to appear on the leaderboard!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {displayEntries.map((e, index) => {
              // Use index as fallback key if rank is duplicated
              const uniqueKey = `${e.rank}-${e.name}-${index}`;
              const pointsVal = e.points || 0;
              const badge = pointsVal >= 200 ? { label: 'Community Hero', color: '#dc2626', bg: '#fef2f2', icon: '🦸' } :
                            pointsVal >= 100 ? { label: 'Civic Guardian', color: '#2563eb', bg: '#eff6ff', icon: '🛡️' } :
                            pointsVal >= 50 ? { label: 'Civic Champion', color: '#d97706', bg: '#fef3c7', icon: '🏆' } :
                            pointsVal >= 10 ? { label: 'Community Helper', color: '#16a34a', bg: '#f0fdf4', icon: '🤝' } :
                            { label: 'Novice', color: '#64748b', bg: '#f1f5f9', icon: '🌱' };
              
              return (
                <div 
                  key={uniqueKey}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    background: e.isCurrentUser ? '#e0f2fe' : index < 3 ? '#fefce8' : '#f8fafc', 
                    padding: '0.75rem 1rem', 
                    borderRadius: 12,
                    border: e.isCurrentUser ? '2px solid #0ea5e9' : index < 3 ? '1px solid #facc15' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ 
                      fontWeight: '600', 
                      color: index < 3 ? '#ca8a04' : '#64748b',
                      minWidth: '2rem'
                    }}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${e.rank}.`}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ color: '#1e293b', fontWeight: e.isCurrentUser ? '600' : '500' }}>
                        {e.isCurrentUser ? `${e.name || 'You'} (You)` : e.name || 'Unknown'}
                      </span>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        color: badge.color,
                        background: badge.bg,
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        marginTop: '0.15rem',
                        width: 'fit-content',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.15rem'
                      }}>
                        {badge.icon} {badge.label}
                      </span>
                    </div>
                  </div>
                  <strong style={{ color: '#1e293b', fontSize: '1rem' }}>{pointsVal} pts</strong>
                </div>
              );
            })}
          </div>
        )}
        
        {!hideBackButton && (
          <button className="btn-secondary" style={{ marginTop: '1.5rem', width: '100%' }} onClick={() => navigate('/citizen')}>
            Back to Dashboard
          </button>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;