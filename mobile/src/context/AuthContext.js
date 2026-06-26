import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const savedUser = await AsyncStorage.getItem('intellicivic_user');
      const savedAdmin = await AsyncStorage.getItem('intellicivic_admin');
      const token = await AsyncStorage.getItem('intellicivic_token');

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

  const login = async (userData, admin = false) => {
    try {
      if (admin) {
        await AsyncStorage.setItem('intellicivic_admin', JSON.stringify(userData));
        await AsyncStorage.setItem('intellicivic_token', userData.token || '');
        setIsAdmin(true);
      } else {
        await AsyncStorage.setItem('intellicivic_user', JSON.stringify(userData));
        await AsyncStorage.setItem('intellicivic_token', userData.token || '');
        setIsAdmin(false);
      }
      setUser(userData);
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove([
        'intellicivic_user',
        'intellicivic_admin',
        'intellicivic_token'
      ]);
      setUser(null);
      setIsAdmin(false);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, isLoading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

