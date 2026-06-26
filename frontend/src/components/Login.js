import React, { useState, useContext, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import { LanguageContext } from '../App';
import { ArrowLeft, Phone, Key } from 'lucide-react';
import apiService from '../services/api';

const Login = ({ setUser, setIsAdmin }) => {
  const navigate = useNavigate();
  const { t } = useContext(LanguageContext);
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (resendTimer === 0 && interval) {
      clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendTimer]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (mobile.length !== 10) {
      toast.warning('Please enter a valid 10-digit mobile number');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiService.sendOtpByMobile(mobile);
      setIsOtpSent(true);
      setResendTimer(30);
      
      // Show the OTP in a message
      if (response.data && response.data.otp) {
        toast.success(`OTP sent. Your OTP: ${response.data.otp}`);
      } else {
        toast.success('OTP sent to your phone');
      }
    } catch (error) {
      if (error.message.includes('Please register before proceeding')) {
        toast.error('This mobile number is not registered. Please register first before logging in.');
        // Optionally redirect to registration page
        // navigate('/register');
      } else {
        toast.error(`Error: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiService.sendOtpByMobile(mobile);
      setResendTimer(30);
      
      // Show the new OTP in a message
      if (response.data && response.data.otp) {
        toast.success(`New OTP sent. Your OTP: ${response.data.otp}`);
      } else {
        toast.success('New OTP sent to your phone');
      }
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.warning('Please enter a valid 6-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiService.verifyOtp(mobile, otp);
      const user = {
        id: response.data.user._id,
        name: response.data.user.name,
        phone: response.data.user.mobile || null,
        isGuest: false,
        token: response.data.token
      };
      setUser(user);
      localStorage.setItem('intellicivic_user', JSON.stringify(user));
      localStorage.setItem('intellicivic_token', response.data.token);
      // Ensure admin session is cleared so citizen routes are accessible
      try { localStorage.removeItem('intellicivic_admin'); } catch (_) {}
      if (typeof setIsAdmin === 'function') {
        setIsAdmin(false);
      }
      navigate('/citizen');
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Guest login removed as requested

  return (
    <div className="login-container">
      <div className="login-card">
        <button 
          onClick={() => navigate('/')}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: '#1e4359', 
            cursor: 'pointer',
            marginBottom: '1rem'
          }}
        >
          <ArrowLeft size={20} />
        </button>

        <div className="login-header">
          <h1 className="login-title">{t('login')}</h1>
          <p className="login-subtitle">Enter your mobile number to continue</p>
        </div>

        {!isOtpSent ? (
          <form onSubmit={handleSendOtp} className="login-form">
            <div className="form-group">
              <label className="form-label">
                <Phone size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                Mobile Number
              </label>
              <input
                type="tel"
                className="form-input"
                placeholder="Enter 10-digit mobile number"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                maxLength={10}
                pattern="[0-9]{10}"
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isLoading || mobile.length !== 10}
            >
              {isLoading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="login-form">
            <div className="form-group">
              <label className="form-label">
                <Key size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                Enter OTP
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                maxLength={6}
                required
              />
              <small style={{ color: '#666', fontSize: '0.8rem' }}>
                OTP sent to mobile ending with {mobile.slice(-4)}
              </small>
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={isLoading || otp.length !== 6}
            >
              {isLoading ? 'Verifying...' : 'Verify & Login'}
            </button>

            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              {resendTimer > 0 ? (
                <span style={{ color: '#666', fontSize: '0.9rem' }}>
                  Resend OTP in {resendTimer} seconds
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#1e4359',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    textDecoration: 'underline',
                    fontSize: '0.9rem',
                    padding: '0.5rem'
                  }}
                >
                  Resend OTP
                </button>
              )}
            </div>
          </form>
        )}

        {/* Guest login removed */}

        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <span>Don't have an account? </span>
          <Link to="/register" style={{ color: '#1e4359' }}>Register</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;