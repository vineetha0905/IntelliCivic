import React, { useState, useContext } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { LanguageContext } from '../App';
import apiService from '../services/api';

const Register = () => {
  const navigate = useNavigate();
  const { t } = useContext(LanguageContext);

  const [name, setName] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUseMyLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      try {
        // Try OpenStreetMap Nominatim reverse geocoding (no API key needed for light use)
        const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
        const data = await resp.json();
        const line = data.display_name || `${data.address?.road || ''} ${data.address?.city || data.address?.town || data.address?.village || ''}`.trim();
        setAddress(line);
      } catch (e) {
        setAddress(`Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}`);
      }
    }, (err) => {
      toast.error('Unable to retrieve your location');
      console.error(err);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (aadhaarNumber.length !== 12) {
      toast.warning('Please enter a valid 12-digit Aadhaar number');
      return;
    }
    if (mobile.length !== 10) {
      toast.warning('Please enter a valid 10-digit mobile number');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await apiService.registerUser({ name, aadhaarNumber, mobile, address });
      toast.success('Registered successfully');
      // Optionally store token/user if returned
      if (result.data && result.data.token && result.data.user) {
        localStorage.setItem('intellicivic_user', JSON.stringify({
          id: result.data.user._id,
          name: result.data.user.name,
          phone: result.data.user.mobile || null,
          isGuest: false,
          token: result.data.token
        }));
        localStorage.setItem('intellicivic_token', result.data.token);
      }
      navigate('/login');
    } catch (error) {
      toast.error(`Registration failed: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">{t('register')}</h1>
          <p className="login-subtitle">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Aadhaar Number</label>
            <input
              type="tel"
              className="form-input"
              placeholder="12-digit Aadhaar"
              value={aadhaarNumber}
              onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ''))}
              maxLength={12}
              pattern="[0-9]{12}"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mobile Number</label>
            <input
              type="tel"
              className="form-input"
              placeholder="10-digit mobile"
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
              maxLength={10}
              pattern="[0-9]{10}"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Address</label>
            <textarea
              className="form-input"
              placeholder="Your address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
            />
            <button type="button" className="btn-secondary" onClick={handleUseMyLocation}>
              Use my location
            </button>
          </div>

          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Registering...' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;


