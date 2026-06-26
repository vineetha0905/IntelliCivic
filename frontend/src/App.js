import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Import components
import Welcome from './components/Welcome';
import Login from './components/Login';
import Register from './components/Register';
import CitizenDashboard from './components/CitizenDashboard';
import ReportIssue from './components/ReportIssue';
import MyReports from './components/MyReports';
import NearbyIssues from './components/NearbyIssues';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import EmployeeLogin from './components/EmployeeLogin';
import EmployeeDashboard from './components/EmployeeDashboard';
import EmployeeProfile from './components/EmployeeProfile';
import IssueDetail from './components/IssueDetail';
import ResolveIssue from './components/ResolveIssue';
import Leaderboard from './components/Leaderboard';
import Profile from './components/Profile';

// Language Context
export const LanguageContext = React.createContext();

function App() {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is logged in on app start
  useEffect(() => {
    const checkAuth = () => {
      try {
        const savedUser = localStorage.getItem('intellicivic_user');
        const savedAdmin = localStorage.getItem('intellicivic_admin');
        const token = localStorage.getItem('intellicivic_token');
        
        if (savedAdmin) {
          const adminUser = JSON.parse(savedAdmin);
          setUser(adminUser);
          setIsAdmin(true);
        } else if (savedUser && token) {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const languageData = {
    en: {
      welcome: 'Welcome to IntelliCivic',
      getStarted: 'Get Started',
      reportIssue: 'Report Issue',
      myReports: 'My Reports',
      nearbyIssues: 'Nearby Issues',
      login: 'Login',
      register: 'Register',
      adminLogin: 'Admin Login',
      dashboard: 'Dashboard',
      hello: 'Hello, Report your issue today!',
      selectLanguage: 'Select Language'
    },
    hi: {
      welcome: 'IntelliCivic में आपका स्वागत है',
      getStarted: 'शुरू करें',
      reportIssue: 'समस्या रिपोर्ट करें',
      myReports: 'मेरी रिपोर्ट्स',
      nearbyIssues: 'आसपास की समस्याएं',
      login: 'लॉगिन',
      register: 'रजिस्टर करें',
      adminLogin: 'एडमिन लॉगिन',
      dashboard: 'डैशबोर्ड',
      hello: 'हैलो, आज अपनी समस्या रिपोर्ट करें!',
      selectLanguage: 'भाषा चुनें'
    },
    sat: {
      welcome: 'IntelliCivic ᱨᱮ ᱥᱟᱨᱦᱟᱣ',
      getStarted: 'ᱮᱛᱦᱚᱵ ᱢᱮ',
      reportIssue: 'ᱵᱟᱝ ᱠᱟᱹᱢᱤ ᱠᱷᱚᱵᱚᱨ ᱢᱮ',
      myReports: 'ᱤᱧᱟᱜ ᱠᱷᱚᱵᱚᱨ ᱠᱚ',
      nearbyIssues: 'ᱥᱩᱨ ᱨᱮᱱᱟᱜ ᱵᱟᱝ ᱠᱟᱹᱢᱤ',
      login: 'ᱵᱚᱞᱚ ᱫᱚᱦᱚ',
      register: 'ᱧᱩᱛᱩム ᱚᱞ',
      adminLogin: 'ᱮᱰᱢᱤᱱ ᱵᱚᱞᱚ',
      dashboard: 'ᱰᱮᱥᱵᱚᱰ',
      hello: 'ᱡᱚᱦᱟᱨ, ᱛᱤᱱᱟᱹᱜ ᱫᱤᱱ ᱟᱢᱟᱜ ᱵᱟᱝ ᱠᱟᱹᱢᱤ ᱠᱷᱚᱵᱚᱨ ᱢᱮ!',
      selectLanguage: 'ᱯᱟᱹᱨᱥᱤ ᱵᱟᱪᱷᱟᱣ ᱢᱮ'
    },
    nag: {
      welcome: 'IntelliCivic में आपका स्वागत है',
      getStarted: 'शुरू करीं',
      reportIssue: 'समस्या रिपोर्ट करीं',
      myReports: 'हमार रिपोर्ट सब',
      nearbyIssues: 'आसपास के समस्या',
      login: 'लॉगिन',
      register: 'रजिस्टर करीं',
      adminLogin: 'एडमिन लॉगिन',
      dashboard: 'डैशबोर्ड',
      hello: 'नमस्कार, आज अपन समस्या रिपोर्ट करीं!',
      selectLanguage: 'भाषा चुनीं'
    }
  };

  // Show spinner while checking authentication
  if (isLoading) {
    return (
      <LanguageContext.Provider value={{
        currentLanguage,
        setCurrentLanguage,
        t: (key) => languageData[currentLanguage][key] || languageData.en[key]
      }}>
        <div className="App" style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #123244 0%, #1e4359 28%, #3f6177 62%, #d8c7bd 100%)'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid rgba(255, 255, 255, 0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </LanguageContext.Provider>
    );
  }

  return (
    <LanguageContext.Provider value={{
      currentLanguage,
      setCurrentLanguage,
      t: (key) => languageData[currentLanguage][key] || languageData.en[key]
    }}>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/login" element={<Login setUser={setUser} setIsAdmin={setIsAdmin} />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin-login" element={<AdminLogin setUser={setUser} setIsAdmin={setIsAdmin} />} />
            <Route path="/employee-login" element={<EmployeeLogin setUser={setUser} setIsAdmin={setIsAdmin} />} />
            
            {/* Citizen Routes */}
            <Route path="/citizen" element={
              user && !isAdmin ? <CitizenDashboard user={user} setUser={setUser} /> : <Navigate to="/login" />
            } />
            <Route path="/report-issue" element={
              user && !isAdmin ? <ReportIssue user={user} /> : <Navigate to="/login" />
            } />
            <Route path="/my-reports" element={
              user && !isAdmin ? <MyReports user={user} /> : <Navigate to="/login" />
            } />
            <Route path="/nearby-issues" element={
              user && !isAdmin ? <NearbyIssues user={user} /> : <Navigate to="/login" />
            } />
            <Route path="/leaderboard" element={
              user && !isAdmin ? <Leaderboard /> : <Navigate to="/login" />
            } />
            <Route path="/issue/:id" element={
              user ? <IssueDetail user={user} isAdmin={isAdmin} /> : <Navigate to="/login" />
            } />
            <Route path="/profile" element={
              user && !isAdmin ? <Profile /> : <Navigate to="/login" />
            } />
            
            {/* Admin Routes */}
            <Route path="/admin" element={
              user && isAdmin ? <AdminDashboard user={user} /> : <Navigate to="/admin-login" />
            } />

            {/* Employee Routes */}
            <Route path="/employee" element={
              user && !isAdmin ? <EmployeeDashboard user={user} setUser={setUser} /> : <Navigate to="/login" />
            } />
            <Route path="/employee/profile" element={
              user && !isAdmin ? <EmployeeProfile user={user} setUser={setUser} /> : <Navigate to="/login" />
            } />
            <Route path="/employee/resolve/:id" element={
              user && !isAdmin ? <ResolveIssue /> : <Navigate to="/login" />
            } />
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </div>
    </LanguageContext.Provider>
  );
}

export default App;