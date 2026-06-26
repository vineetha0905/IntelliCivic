import React, { createContext, useState } from 'react';

export const LanguageContext = createContext();

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
    register: 'ᱧᱩᱛᱩᱢ ᱚᱞ',
    adminLogin: 'ᱮᱰᱢᱤᱱ ᱵᱚᱞᱚ',
    dashboard: 'ᱰᱮᱥᱵᱚᱰ',
    hello: 'ᱡᱚᱦᱟᱨ, ᱛᱤᱱᱟᱹᱜ ᱫᱤᱱ ᱟᱢᱟᱜ ᱵᱟᱝ ᱠᱟᱹᱢᱤ ᱠᱷᱚᱵᱚᱨ ᱢᱮ!',
    selectLanguage: 'ᱯᱟᱹᱨᱥᱤ ᱵᱟᱪᱷᱟᱣ ᱢᱮ'
  },
  nag: {
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
  }
};

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');

  const t = (key) => {
    return languageData[currentLanguage]?.[key] || languageData.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, setCurrentLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

