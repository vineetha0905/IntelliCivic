import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getMyProfile();
        setProfile(data.data?.user || data.user || null);
      } catch (e) {
        // Fallback from local storage
        try {
          const cached = JSON.parse(localStorage.getItem('intellicivic_user'));
          setProfile(cached || null);
        } catch (_) {}
        setError('Could not fetch profile from server');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="form-container"><div className="form-card">Loading…</div></div>
    );
  }

  if (!profile) {
    return (
      <div className="form-container"><div className="form-card">No profile found.</div></div>
    );
  }

  return (
    <div className="form-container" style={{ paddingBottom: '80px' }}>
      <div className="form-card" style={{ maxWidth: 700 }}>
        <h1 style={{ marginBottom: '1rem' }}>My Profile</h1>
        {error && <div style={{ color: '#b91c1c', marginBottom: '0.75rem' }}>{error}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label className="form-label">Name</label>
            <div className="form-input" style={{ padding: '0.8rem' }}>{profile.name || '-'}</div>
          </div>
          <div>
            <label className="form-label">Aadhaar Number</label>
            <div className="form-input" style={{ padding: '0.8rem' }}>{profile.aadhaarNumber || '-'}</div>
          </div>
          <div>
            <label className="form-label">Mobile</label>
            <div className="form-input" style={{ padding: '0.8rem' }}>{profile.mobile || '-'}</div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Address</label>
            <div className="form-input" style={{ padding: '0.8rem' }}>
              {profile.address?.street || profile.address || '-'}
            </div>
          </div>
        </div>
        <button className="btn-secondary" style={{ marginTop: '1rem' }} onClick={() => navigate('/citizen')}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default Profile;
