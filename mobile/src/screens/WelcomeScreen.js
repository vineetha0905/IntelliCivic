import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LanguageContext } from '../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';

const WelcomeScreen = () => {
  const navigation = useNavigation();
  const { currentLanguage, setCurrentLanguage, t } = useContext(LanguageContext);

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
    { code: 'sat', name: 'ᱥᱟᱱᱛᱟᱲᱤ', flag: '🏛️' },
    { code: 'nag', name: 'नागपुरी', flag: '🏞️' },
  ];

  const handleGetStarted = () => {
    navigation.navigate('Login');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('welcome')}</Text>
        <Text style={styles.subtitle}>
          Community Hero, Hyperlocal Problem Solver
        </Text>
      </View>

      {/* Logo placeholder - replace with actual logo asset */}
      <View style={styles.logoPlaceholder}>
        <Ionicons name="shield-checkmark" size={100} color="#1e4359" />
      </View>

      <View style={styles.languageSection}>
        <Text style={styles.languageTitle}>{t('selectLanguage')}</Text>
        <View style={styles.languageGrid}>
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.languageOption,
                currentLanguage === lang.code && styles.languageOptionSelected,
              ]}
              onPress={() => setCurrentLanguage(lang.code)}
            >
              <Text style={styles.flag}>{lang.flag}</Text>
              <Text
                style={[
                  styles.languageName,
                  currentLanguage === lang.code && styles.languageNameSelected,
                ]}
              >
                {lang.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.features}>
        <View style={styles.feature}>
          <Ionicons name="location" size={32} color="#1e4359" />
          <Text style={styles.featureText}>Location Based</Text>
        </View>
        <View style={styles.feature}>
          <Ionicons name="camera" size={32} color="#1e4359" />
          <Text style={styles.featureText}>Photo Reports</Text>
        </View>
        <View style={styles.feature}>
          <Ionicons name="people" size={32} color="#1e4359" />
          <Text style={styles.featureText}>Community</Text>
        </View>
        <View style={styles.feature}>
          <Ionicons name="warning" size={32} color="#1e4359" />
          <Text style={styles.featureText}>Track Issues</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleGetStarted}>
        <Text style={styles.buttonText}>{t('getStarted')}</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <TouchableOpacity onPress={() => navigation.navigate('AdminLogin')}>
          <Text style={styles.footerLink}>{t('adminLogin')}</Text>
        </TouchableOpacity>
        <Text style={styles.footerSeparator}>|</Text>
        <TouchableOpacity onPress={() => navigation.navigate('EmployeeLogin')}>
          <Text style={styles.footerLink}>Employee Login</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  logoPlaceholder: {
    width: 200,
    height: 200,
    marginBottom: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderRadius: 100,
  },
  languageSection: {
    width: '100%',
    marginBottom: 30,
  },
  languageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 15,
    textAlign: 'center',
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  languageOption: {
    width: '48%',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  languageOptionSelected: {
    borderColor: '#1e4359',
    backgroundColor: '#f0f9ff',
  },
  flag: {
    fontSize: 32,
    marginBottom: 8,
  },
  languageName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  languageNameSelected: {
    color: '#1e4359',
    fontWeight: '600',
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 30,
  },
  feature: {
    width: '45%',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
  },
  featureText: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#1e4359',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 30,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  footerLink: {
    color: '#1e4359',
    fontSize: 14,
    fontWeight: '500',
  },
  footerSeparator: {
    marginHorizontal: 10,
    color: '#94a3b8',
  },
});

export default WelcomeScreen;

