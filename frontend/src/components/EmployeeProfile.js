import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import apiService from '../services/api';
import { ArrowLeft, User, Mail, Phone, Briefcase, Shield, LogOut } from 'lucide-react';

const EmployeeProfile = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await apiService.getMyProfile();
      setProfileData(response.data?.user || response.user || user);
    } catch (error) {
      toast.error(`Failed to load profile: ${error.message}`);
      setProfileData(user);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('intellicivic_token');
    localStorage.removeItem('intellicivic_user');
    setUser && setUser(null);
    navigate('/employee-login');
  };

  const getRoleLabel = (role) => {
    const roleMap = {
      'field-staff': 'Field Staff',
      'supervisor': 'Supervisor',
      'commissioner': 'Commissioner',
      'employee': 'Employee'
    };
    return roleMap[role] || role;
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
      <span className={`${c.bg} ${c.text} px-3 py-1.5 rounded-full text-sm font-medium`}>
        {c.label}
      </span>
    );
  };

  const profile = profileData || user;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/employee')}
                className="mr-3 p-1 text-gray-700 hover:text-gray-900"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center gap-6 mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <User size={40} className="text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {profile?.name || 'Employee'}
              </h2>
              <div className="mb-2">
                {getRoleBadge(profile?.role)}
              </div>
              <p className="text-gray-600 text-sm">
                Employee ID: <span className="font-medium">{profile?.employeeId || 'N/A'}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 mb-1 block">Name</label>
                <div className="flex items-center gap-2 text-gray-900">
                  <User size={16} className="text-gray-400" />
                  <span>{profile?.name || 'N/A'}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 mb-1 block">Employee ID</label>
                <div className="flex items-center gap-2 text-gray-900">
                  <Shield size={16} className="text-gray-400" />
                  <span className="font-mono">{profile?.employeeId || 'N/A'}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 mb-1 block">Role</label>
                <div className="flex items-center gap-2">
                  <Briefcase size={16} className="text-gray-400" />
                  <span className="text-gray-900">{getRoleLabel(profile?.role)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {profile?.email && (
                <div>
                  <label className="text-sm font-medium text-gray-500 mb-1 block">Email</label>
                  <div className="flex items-center gap-2 text-gray-900">
                    <Mail size={16} className="text-gray-400" />
                    <span>{profile.email}</span>
                  </div>
                </div>
              )}

              {profile?.mobile && (
                <div>
                  <label className="text-sm font-medium text-gray-500 mb-1 block">Mobile</label>
                  <div className="flex items-center gap-2 text-gray-900">
                    <Phone size={16} className="text-gray-400" />
                    <span>{profile.mobile}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-500 mb-1 block">Status</label>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    profile?.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {profile?.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <label className="text-sm font-medium text-gray-500 mb-2 block">Departments</label>
            <div className="flex flex-wrap gap-2">
              {(profile?.departments && profile.departments.length > 0
                ? profile.departments
                : (profile?.department ? [profile.department] : [])
              ).map((dept, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium"
                >
                  {dept}
                </span>
              ))}
              {(!profile?.departments || profile.departments.length === 0) && !profile?.department && (
                <span className="text-gray-400 text-sm">No departments assigned</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfile;

