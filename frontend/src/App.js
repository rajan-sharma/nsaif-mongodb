import React, { useState, useEffect, useContext, createContext } from 'react';
import './App.css';
import axios from 'axios';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const userData = localStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    }
    setLoading(false);
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Login Component
const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    organization_name: '',
    designation: '',
    corporate_email: '',
    contact_number: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (showForgotPassword) {
        // Handle forgot password
        await axios.post(`${API}/auth/forgot-password`, { email: formData.email });
        setMessage('Password reset link sent to your email');
        setShowForgotPassword(false);
      } else {
        const endpoint = isLogin ? '/auth/login' : '/auth/register';
        const payload = isLogin 
          ? { email: formData.email, password: formData.password }
          : formData;

        const response = await axios.post(`${API}${endpoint}`, payload);
        login(response.data.token, response.data.user);
      }
    } catch (error) {
      setError(error.response?.data?.detail || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h1>
            <p className="text-gray-600">Enter your email to receive reset instructions</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setShowForgotPassword(false)}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Security Assessment</h1>
          <p className="text-gray-600">
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  name="first_name"
                  placeholder="First Name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="text"
                  name="last_name"
                  placeholder="Last Name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <input
                type="text"
                name="organization_name"
                placeholder="Organization Name"
                value={formData.organization_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="text"
                name="designation"
                placeholder="Designation"
                value={formData.designation}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="email"
                name="corporate_email"
                placeholder="Corporate Email (Optional)"
                value={formData.corporate_email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                name="contact_number"
                placeholder="Contact Number (Optional)"
                value={formData.contact_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </>
          )}
          
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
          >
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-6 text-center space-y-3">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
          
          {isLogin && (
            <div>
              <button
                onClick={() => setShowForgotPassword(true)}
                className="text-gray-600 hover:text-gray-800 text-sm"
              >
                Forgot your password?
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Admin Panel Component
const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('global-dashboard');
  const [platformStats, setPlatformStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserDashboard, setSelectedUserDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userLoading, setUserLoading] = useState(false);
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [newUserData, setNewUserData] = useState({
    first_name: '', last_name: '', email: '', organization_name: '',
    designation: '', password: '', role: 'user'
  });

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        axios.get(`${API}/admin/platform-stats`),
        axios.get(`${API}/admin/users`)
      ]);
      
      setPlatformStats(statsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserDashboard = async (userId) => {
    if (!userId) return;
    
    setUserLoading(true);
    try {
      const response = await axios.get(`${API}/admin/user-dashboard/${userId}`);
      setSelectedUserDashboard(response.data);
    } catch (error) {
      console.error('Error loading user dashboard:', error);
    } finally {
      setUserLoading(false);
    }
  };

  const handleUserSelect = (userId) => {
    setSelectedUserId(userId);
    loadUserDashboard(userId);
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    try {
      await axios.put(`${API}/admin/users/${userId}`, { status: newStatus });
      loadAdminData();
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Error updating user status');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/admin/users`, newUserData);
      setShowCreateUserForm(false);
      setNewUserData({
        first_name: '', last_name: '', email: '', organization_name: '',
        designation: '', password: '', role: 'user'
      });
      loadAdminData();
      alert('User created successfully');
    } catch (error) {
      console.error('Error creating user:', error);
      alert(error.response?.data?.detail || 'Error creating user');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          <span className="ml-3 text-gray-600">Loading admin data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Portal</h1>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('global-dashboard')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'global-dashboard'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Global Dashboard
            </button>
            <button
              onClick={() => setActiveTab('user-specific')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'user-specific'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              User-Specific View
            </button>
            <button
              onClick={() => setActiveTab('user-management')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'user-management'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              User Management
            </button>
          </nav>
        </div>

        {/* Global Dashboard Tab */}
        {activeTab === 'global-dashboard' && platformStats && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Platform-Wide Metrics</h2>
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Users</h3>
                <div className="text-3xl font-bold text-blue-600">{platformStats.user_stats.total_users}</div>
                <div className="text-sm text-gray-500">Active: {platformStats.user_stats.active_users} | Blocked: {platformStats.user_stats.blocked_users}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Assessments</h3>
                <div className="text-3xl font-bold text-green-600">{platformStats.assessment_stats.total_assessments}</div>
                <div className="text-sm text-gray-500">Responses: {platformStats.assessment_stats.total_responses}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Overall Score</h3>
                <div className="text-3xl font-bold text-purple-600">{platformStats.assessment_stats.overall_average_score}/5</div>
                <div className="text-sm text-gray-500">Platform Average</div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">User Roles</h3>
                <div className="text-xl font-bold text-orange-600">Admin: {platformStats.user_stats.admin_users}</div>
                <div className="text-xl font-bold text-teal-600">Users: {platformStats.user_stats.regular_users}</div>
              </div>
            </div>

            {/* Scoring Trends */}
            <div className="bg-white rounded-lg shadow mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Overall Scoring Trends</h3>
              </div>
              <div className="p-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={platformStats.scoring_trends || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="domain_name" />
                      <YAxis domain={[0, 5]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="average_score" fill="#8884d8" name="Average Score" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Recent Assessments */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Assessments</h3>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submission Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assessment ID</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(platformStats.recent_assessments || []).map((assessment) => (
                        <tr key={assessment.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {assessment.user_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {assessment.user_email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(assessment.submission_date).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {assessment.id.substring(0, 8)}...
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User-Specific View Tab */}
        {activeTab === 'user-specific' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">User-Specific Dashboard View</h2>
            
            {/* User Selection */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select User:</label>
              <select
                value={selectedUserId}
                onChange={(e) => handleUserSelect(e.target.value)}
                className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Select a user...</option>
                {users.filter(u => u.role === 'user').map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            {/* User Dashboard Display */}
            {userLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                <span className="ml-3 text-gray-600">Loading user dashboard...</span>
              </div>
            ) : selectedUserDashboard ? (
              <div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-blue-900">
                    Viewing Dashboard for: {selectedUserDashboard.user.first_name} {selectedUserDashboard.user.last_name}
                  </h3>
                  <p className="text-blue-700">{selectedUserDashboard.user.email} - {selectedUserDashboard.user.organization_name}</p>
                </div>

                {selectedUserDashboard.stats ? (
                  <div>
                    {/* User's KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Responses</h3>
                        <div className="text-3xl font-bold text-blue-600">{selectedUserDashboard.stats.total_responses}</div>
                      </div>
                      <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Domains Completed</h3>
                        <div className="text-3xl font-bold text-green-600">{selectedUserDashboard.stats.domains_completed}</div>
                      </div>
                      <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Overall Score</h3>
                        <div className="text-3xl font-bold text-purple-600">{selectedUserDashboard.stats.overall_average}/5</div>
                      </div>
                    </div>

                    {/* User's Domain Scores */}
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Domain Performance</h3>
                      <div className="space-y-4">
                        {(selectedUserDashboard.stats.domain_scores || []).map((domain) => (
                          <div key={domain.domain_id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-gray-900">{domain.domain_name}</span>
                              <span className="text-lg font-bold text-blue-600">{domain.average_score}/5</span>
                            </div>
                            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${(domain.average_score / 5) * 100}%` }}
                              ></div>
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {domain.total_questions} questions answered
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <p className="text-gray-600">This user has not completed any assessments yet.</p>
                  </div>
                )}
              </div>
            ) : selectedUserId ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                <p className="text-gray-600">Please select a user to view their dashboard.</p>
              </div>
            ) : null}
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === 'user-management' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">User Management</h2>
            
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">All Users</h3>
                <button 
                  onClick={() => setShowCreateUserForm(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Create New User
                </button>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{user.first_name} {user.last_name}</div>
                            <div className="text-sm text-gray-500">{user.designation}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.organization_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.role === 'admin' 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              (user.status || 'active') === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {user.status || 'active'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button 
                              onClick={() => toggleUserStatus(user.id, user.status || 'active')}
                              className={`mr-2 px-3 py-1 rounded text-xs ${
                                (user.status || 'active') === 'active'
                                  ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                  : 'bg-green-100 text-green-800 hover:bg-green-200'
                              }`}
                            >
                              {(user.status || 'active') === 'active' ? 'Block' : 'Activate'}
                            </button>
                            <button className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-xs hover:bg-blue-200">
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create User Modal */}
        {showCreateUserForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New User</h3>
              
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="First Name"
                    value={newUserData.first_name}
                    onChange={(e) => setNewUserData({...newUserData, first_name: e.target.value})}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={newUserData.last_name}
                    onChange={(e) => setNewUserData({...newUserData, last_name: e.target.value})}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>
                <input
                  type="email"
                  placeholder="Email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Organization Name"
                  value={newUserData.organization_name}
                  onChange={(e) => setNewUserData({...newUserData, organization_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Designation"
                  value={newUserData.designation}
                  onChange={(e) => setNewUserData({...newUserData, designation: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({...newUserData, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
                  >
                    Create User
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateUserForm(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main App Container
const MainApp = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [currentDomainId, setCurrentDomainId] = useState(null);
  const [domains, setDomains] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState({});
  const [assessments, setAssessments] = useState([]);
  const [currentAssessment, setCurrentAssessment] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showOverviewGraph, setShowOverviewGraph] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  
  // Cascading dropdown states
  const [selectedDomainForChart, setSelectedDomainForChart] = useState('');
  const [selectedSubdomainForChart, setSelectedSubdomainForChart] = useState('');
  const [selectedControlForChart, setSelectedControlForChart] = useState('');
  const [subdomains, setSubdomains] = useState([]);
  const [controls, setControls] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [radarData, setRadarData] = useState([]);
  
  const { user, logout } = useAuth();

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (assessments.length > 0 && !currentAssessment) {
      const sortedAssessments = [...assessments].sort((a, b) => new Date(b.submission_date) - new Date(a.submission_date));
      setCurrentAssessment(sortedAssessments[0]);
    }
  }, [assessments]);

  useEffect(() => {
    if (currentAssessment) {
      loadAssessmentStats(currentAssessment.id);
    }
  }, [currentAssessment]);

  useEffect(() => {
    if (stats && stats.domain_scores) {
      updateRadarChart();
    }
  }, [stats, selectedDomainForChart, selectedSubdomainForChart, selectedControlForChart]);

  const loadInitialData = async () => {
    try {
      const [domainsRes, assessmentsRes] = await Promise.all([
        axios.get(`${API}/domains`),
        axios.get(`${API}/assessments/my-assessments`)
      ]);
      
      setDomains(domainsRes.data);
      setAssessments(assessmentsRes.data);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAssessmentStats = async (assessmentId) => {
    try {
      const response = await axios.get(`${API}/dashboard/stats/${assessmentId}`);
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadSubdomains = async (domainId) => {
    try {
      const response = await axios.get(`${API}/admin/subdomains`);
      const filteredSubdomains = response.data.filter(sub => sub.domain_id === domainId);
      setSubdomains(filteredSubdomains);
    } catch (error) {
      console.error('Error loading subdomains:', error);
    }
  };

  const loadControls = async (subdomainId) => {
    try {
      const response = await axios.get(`${API}/admin/controls`);
      const filteredControls = response.data.filter(control => control.subdomain_id === subdomainId);
      setControls(filteredControls);
    } catch (error) {
      console.error('Error loading controls:', error);
    }
  };

  const loadMetrics = async (controlId) => {
    try {
      const response = await axios.get(`${API}/admin/metrics`);
      const filteredMetrics = response.data.filter(metric => metric.control_id === controlId);
      setMetrics(filteredMetrics);
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const updateRadarChart = () => {
    if (!stats || !stats.domain_scores) return;

    let chartData = [];

    if (!selectedDomainForChart) {
      // Show all domains
      chartData = stats.domain_scores.map(domain => ({
        name: domain.domain_name,
        score: domain.average_score
      }));
    } else if (!selectedSubdomainForChart) {
      // Show subdomains for selected domain
      chartData = subdomains.map(sub => ({
        name: sub.name,
        score: Math.random() * 5 // Placeholder - you'd calculate actual subdomain scores
      }));
    } else if (!selectedControlForChart) {
      // Show controls for selected subdomain
      chartData = controls.map(control => ({
        name: control.name,
        score: Math.random() * 5 // Placeholder
      }));
    } else {
      // Show metrics for selected control
      chartData = metrics.map(metric => ({
        name: metric.name,
        score: Math.random() * 5 // Placeholder
      }));
    }

    setRadarData(chartData);
  };

  const handleDomainSelectForChart = async (domainId) => {
    setSelectedDomainForChart(domainId);
    setSelectedSubdomainForChart('');
    setSelectedControlForChart('');
    
    if (domainId) {
      await loadSubdomains(domainId);
    } else {
      setSubdomains([]);
      setControls([]);
      setMetrics([]);
    }
  };

  const handleSubdomainSelectForChart = async (subdomainId) => {
    setSelectedSubdomainForChart(subdomainId);
    setSelectedControlForChart('');
    
    if (subdomainId) {
      await loadControls(subdomainId);
    } else {
      setControls([]);
      setMetrics([]);
    }
  };

  const handleControlSelectForChart = async (controlId) => {
    setSelectedControlForChart(controlId);
    
    if (controlId) {
      await loadMetrics(controlId);
    } else {
      setMetrics([]);
    }
  };

  const exportToPDF = () => {
    // Simple PDF export using window.print()
    const printWindow = window.open('', '_blank');
    const currentDate = new Date().toLocaleDateString();
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Assessment Dashboard Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
            .kpi-card { border: 1px solid #ccc; padding: 15px; text-align: center; }
            .score-bar { width: 100%; height: 20px; background-color: #f0f0f0; border-radius: 10px; }
            .score-fill { height: 100%; background: linear-gradient(to right, #ef4444, #f59e0b, #10b981); border-radius: 10px; }
            @media print { body { -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Security Assessment Dashboard Report</h1>
            <p>Generated on: ${currentDate}</p>
            <p>User: ${user?.email}</p>
          </div>
          
          ${stats ? `
            <div class="kpi-grid">
              <div class="kpi-card">
                <h3>Total Responses</h3>
                <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${stats.total_responses}</div>
              </div>
              <div class="kpi-card">
                <h3>Domains Completed</h3>
                <div style="font-size: 24px; font-weight: bold; color: #10b981;">${stats.domains_completed}</div>
              </div>
              <div class="kpi-card">
                <h3>Overall Average Score</h3>
                <div style="font-size: 24px; font-weight: bold; color: #8b5cf6;">${stats.overall_average}/5</div>
              </div>
            </div>
            
            <div style="margin: 30px 0;">
              <h2>Overall Assessment Score</h2>
              <div class="score-bar">
                <div class="score-fill" style="width: ${(stats.overall_average / 5) * 100}%;"></div>
              </div>
              <p style="text-align: center; margin-top: 10px;">Score: ${stats.overall_average}/5</p>
            </div>
            
            <div style="margin: 30px 0;">
              <h2>Domain Performance</h2>
              ${(stats.domain_scores || []).map(domain => `
                <div style="margin: 15px 0; padding: 10px; border: 1px solid #e5e7eb;">
                  <div style="display: flex; justify-content: space-between;">
                    <span><strong>${domain.domain_name}</strong></span>
                    <span><strong>${domain.average_score}/5</strong></span>
                  </div>
                  <div class="score-bar" style="margin: 5px 0;">
                    <div class="score-fill" style="width: ${(domain.average_score / 5) * 100}%;"></div>
                  </div>
                  <small>${domain.total_questions} questions answered</small>
                </div>
              `).join('')}
            </div>
          ` : '<p>No assessment data available.</p>'}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  const loadQuestionsForDomain = async (domainId) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/domains/${domainId}/questions`);
      setQuestions(response.data);
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDomainClick = (domain) => {
    setCurrentView('assessment');
    setCurrentDomainId(domain.id);
    loadQuestionsForDomain(domain.id);
  };

  const handleAnswerSelect = (questionId, answerId) => {
    setResponses({
      ...responses,
      [questionId]: answerId
    });
  };

  const getProgressForCurrentDomain = () => {
    if (questions.length === 0) return { answered: 0, total: 0, percentage: 0 };
    
    const answered = questions.filter(q => responses[q.id]).length;
    const total = questions.length;
    const percentage = total > 0 ? (answered / total) * 100 : 0;
    
    return { answered, total, percentage };
  };

  const submitAssessment = async () => {
    setSubmitting(true);
    try {
      const submissionData = {
        responses: Object.entries(responses).map(([questionId, answerId]) => ({
          question_id: questionId,
          selected_answer_id: answerId
        }))
      };

      await axios.post(`${API}/assessments/submit`, submissionData);
      
      await loadInitialData();
      setCurrentView('dashboard');
      setResponses({});
    } catch (error) {
      console.error('Error submitting assessment:', error);
      alert('Error submitting assessment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Security Assessment Platform</h1>
            <p className="text-gray-600">Welcome, {user?.email} {user?.role === 'admin' && <span className="text-red-600 font-semibold">(Admin)</span>}</p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-600 hover:text-gray-900" title="Settings">
              <span>⚙️</span>
            </button>
            <button className="p-2 text-gray-600 hover:text-gray-900" title="Profile">
              <span>👤</span>
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Unified Left Navigation */}
        <nav className="w-64 bg-white shadow-sm h-screen sticky top-0 border-r">
          <div className="p-4">
            {/* Dashboard Option */}
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`w-full flex items-center p-3 rounded-lg mb-3 transition-colors ${
                currentView === 'dashboard'
                  ? 'bg-blue-100 text-blue-800 border-l-4 border-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="mr-3">📊</span>
              <span className="font-medium">Dashboard</span>
            </button>

            {/* Admin Panel - Only show for admins */}
            {user?.role === 'admin' && (
              <button
                onClick={() => setCurrentView('admin')}
                className={`w-full flex items-center p-3 rounded-lg mb-3 transition-colors ${
                  currentView === 'admin'
                    ? 'bg-red-100 text-red-800 border-l-4 border-red-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="mr-3">⚙️</span>
                <span className="font-medium">Admin Panel</span>
              </button>
            )}

            {/* Domains Section */}
            <div className="mb-2">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Assessment Domains</h3>
              <div className="space-y-1">
                {domains.map((domain) => (
                  <button
                    key={domain.id}
                    onClick={() => handleDomainClick(domain)}
                    className={`w-full flex items-center p-3 rounded-lg transition-colors ${
                      currentView === 'assessment' && currentDomainId === domain.id
                        ? 'bg-blue-100 text-blue-800 border-l-4 border-blue-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-3 text-xl">{domain.icon}</span>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-sm">{domain.name}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1">
          {currentView === 'dashboard' ? (
            // Dashboard View
            <div className="p-6">
              <div className="max-w-7xl mx-auto">
                {/* Dashboard Header */}
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Assessment Dashboard</h1>
                  <p className="text-gray-600 mb-4">A comprehensive overview of your assessment progress and insights.</p>
                  
                  {assessments.length > 0 && (
                    <div className="flex items-center space-x-4">
                      <label className="text-sm font-medium text-gray-700">Assessment:</label>
                      <select 
                        value={currentAssessment?.id || ''}
                        onChange={(e) => {
                          const selected = assessments.find(a => a.id === e.target.value);
                          setCurrentAssessment(selected);
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {assessments.map((assessment, index) => (
                          <option key={assessment.id} value={assessment.id}>
                            Assessment {index + 1} - {new Date(assessment.submission_date).toLocaleDateString()}
                          </option>
                        ))}
                      </select>
                      <span className="text-sm text-gray-500">
                        {currentAssessment && new Date(currentAssessment.submission_date).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {assessments.length === 0 ? (
                  <div className="text-center py-12">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">No Assessments Available</h2>
                    <p className="text-gray-600 mb-8">Please complete an assessment first to view your results and analytics.</p>
                    <div className="p-6 bg-blue-50 rounded-lg border border-blue-200 max-w-md mx-auto">
                      <p className="text-blue-800 mb-4">Get started by taking your first security assessment.</p>
                      <p className="text-sm text-blue-600">Navigate to any domain on the left to begin your evaluation.</p>
                    </div>
                  </div>
                ) : stats && (
                  <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Responses</h3>
                        <div className="text-3xl font-bold text-blue-600">{stats.total_responses}</div>
                      </div>
                      <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Domains Completed</h3>
                        <div className="text-3xl font-bold text-green-600">{stats.domains_completed}</div>
                      </div>
                      <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Overall Average Score</h3>
                        <div className="text-3xl font-bold text-purple-600">{stats.overall_average}/5</div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full"
                            style={{ width: `${(stats.overall_average / 5) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-4 mb-8">
                      <button 
                        onClick={() => setShowOverviewGraph(!showOverviewGraph)}
                        className={`px-6 py-2 rounded-lg transition-colors ${
                          showOverviewGraph 
                            ? 'bg-blue-700 text-white' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {showOverviewGraph ? 'Hide Overview Graph' : 'Show Overview Graph'}
                      </button>
                      <button 
                        onClick={() => setShowAnalytics(!showAnalytics)}
                        className={`px-6 py-2 rounded-lg transition-colors ${
                          showAnalytics 
                            ? 'bg-green-700 text-white' 
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
                      </button>
                      <button 
                        onClick={exportToPDF}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        Export PDF
                      </button>
                    </div>

                    {/* Overview Graph Section */}
                    {showOverviewGraph && (
                      <div className="bg-white rounded-lg shadow p-6 mb-8">
                        <h3 className="text-xl font-semibold text-gray-900 mb-4">Overview Radar Chart</h3>
                        
                        {/* Cascading Dropdowns */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Domain:</label>
                            <select
                              value={selectedDomainForChart}
                              onChange={(e) => handleDomainSelectForChart(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">All Domains</option>
                              {domains.map(domain => (
                                <option key={domain.id} value={domain.id}>{domain.name}</option>
                              ))}
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Sub-domain:</label>
                            <select
                              value={selectedSubdomainForChart}
                              onChange={(e) => handleSubdomainSelectForChart(e.target.value)}
                              disabled={!selectedDomainForChart}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            >
                              <option value="">Select Sub-domain</option>
                              {subdomains.map(subdomain => (
                                <option key={subdomain.id} value={subdomain.id}>{subdomain.name}</option>
                              ))}
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Control:</label>
                            <select
                              value={selectedControlForChart}
                              onChange={(e) => handleControlSelectForChart(e.target.value)}
                              disabled={!selectedSubdomainForChart}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            >
                              <option value="">Select Control</option>
                              {controls.map(control => (
                                <option key={control.id} value={control.id}>{control.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        
                        <div className="h-96">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={radarData}>
                              <PolarGrid />
                              <PolarAngleAxis dataKey="name" />
                              <PolarRadiusAxis angle={90} domain={[0, 5]} />
                              <Radar name="Score" dataKey="score" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                              <Tooltip />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* Analytics Section */}
                    {showAnalytics && (
                      <div className="space-y-8">
                        {/* Overall Assessment Score Bar */}
                        <div className="bg-white rounded-lg shadow p-6">
                          <h3 className="text-xl font-semibold text-gray-900 mb-4">Overall Assessment Score</h3>
                          <div className="flex items-center">
                            <div className="flex-1">
                              <div className="flex justify-between text-sm text-gray-600 mb-2">
                                <span>0</span>
                                <span>Current Score: {stats.overall_average}</span>
                                <span>5</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-4">
                                <div
                                  className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-4 rounded-full transition-all duration-500"
                                  style={{ width: `${(stats.overall_average / 5) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                            <div className="ml-4 text-2xl font-bold text-gray-900">
                              {stats.overall_average}/5
                            </div>
                          </div>
                        </div>

                        {/* Domain Performance Analysis */}
                        <div className="bg-white rounded-lg shadow p-6">
                          <h3 className="text-xl font-semibold text-gray-900 mb-4">Domain Performance Analysis</h3>
                          <p className="text-gray-600 mb-6">Click on any domain to view detailed control-level insights and performance metrics.</p>
                          <div className="h-64 mb-6">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={stats.domain_scores || []}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="domain_name" />
                                <YAxis domain={[0, 5]} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="average_score" fill="#3B82F6" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          
                          {/* Domain Cards */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(stats.domain_scores || []).map((domain, index) => (
                              <div key={domain.domain_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                                <div className="flex items-center mb-2">
                                  <span className="text-2xl mr-3">{domains.find(d => d.id === domain.domain_id)?.icon}</span>
                                  <h4 className="font-semibold text-gray-900">{domain.domain_name}</h4>
                                </div>
                                <div className="space-y-1 text-sm text-gray-600">
                                  <p>Questions: {domain.total_questions}</p>
                                  <p>Completion: 100%</p>
                                  <p>Average Score: {domain.average_score}/5</p>
                                </div>
                                <div className="mt-2">
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-blue-600 h-2 rounded-full"
                                      style={{ width: `${(domain.average_score / 5) * 100}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Strengths and Focus Areas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                            <h3 className="text-xl font-semibold text-green-800 mb-4">🏆 Top Strengths</h3>
                            <div className="space-y-3">
                              {(stats.top_strengths || []).map((strength, index) => (
                                <div key={index} className="bg-white rounded p-3">
                                  <div className="font-medium text-green-700">{strength.domain_name}</div>
                                  <div className="text-sm text-gray-600">Average Score: {strength.average_score}/5</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                            <h3 className="text-xl font-semibold text-red-800 mb-4">🎯 Focus Areas</h3>
                            <div className="space-y-3">
                              {(stats.focus_areas || []).map((area, index) => (
                                <div key={index} className="bg-white rounded p-3">
                                  <div className="font-medium text-red-700">{area.domain_name}</div>
                                  <div className="text-sm text-gray-600">Average Score: {area.average_score}/5</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : currentView === 'admin' ? (
            // Admin Panel View
            <AdminPanel />
          ) : (
            // Assessment View
            <div className="p-6">
              <div className="max-w-4xl mx-auto">
                {/* Domain Header */}
                <div className="mb-6">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    {domains.find(d => d.id === currentDomainId)?.name || 'Assessment'}
                  </h2>
                  
                  {/* Progress Tracking */}
                  {questions.length > 0 && (
                    <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Questions Answered: {getProgressForCurrentDomain().answered}/{getProgressForCurrentDomain().total}
                        </span>
                        <span className="text-sm text-gray-500">
                          {Math.round(getProgressForCurrentDomain().percentage)}% Complete
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${getProgressForCurrentDomain().percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Questions */}
                {loading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-gray-600">Loading questions...</p>
                  </div>
                ) : questions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No questions available for this domain yet.</p>
                    <button
                      onClick={() => setCurrentView('dashboard')}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Back to Dashboard
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {questions.map((question, index) => (
                      <div key={question.id} className="bg-white p-6 rounded-lg shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          {index + 1}. {question.question_text}
                        </h3>
                        
                        {/* Answer Options */}
                        <div className="space-y-3 mb-4">
                          {question.answers.map((answer) => (
                            <label
                              key={answer.id}
                              className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                                responses[question.id] === answer.id
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="radio"
                                name={question.id}
                                value={answer.id}
                                checked={responses[question.id] === answer.id}
                                onChange={() => handleAnswerSelect(question.id, answer.id)}
                                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                              />
                              <span className="ml-3 flex-1 text-gray-900">{answer.answer_text}</span>
                              <span className="ml-auto text-sm text-gray-500">
                                Score: {answer.score_value}
                              </span>
                            </label>
                          ))}
                        </div>
                        
                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 text-sm">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                            Sub-domain: {question.subdomain}
                          </span>
                          <span 
                            className="px-2 py-1 bg-green-100 text-green-800 rounded-full cursor-help"
                            title={question.control.definition}
                          >
                            Control: {question.control.name}
                          </span>
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
                            Metric: {question.metric}
                          </span>
                        </div>
                      </div>
                    ))}
                    
                    {/* Submit Button */}
                    <div className="text-center pt-6">
                      <button
                        onClick={submitAssessment}
                        disabled={getProgressForCurrentDomain().answered !== getProgressForCurrentDomain().total || submitting}
                        className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                          getProgressForCurrentDomain().answered === getProgressForCurrentDomain().total && !submitting
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {submitting ? 'Submitting...' : 'Submit Assessment & View Results'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="App">
      {user ? <MainApp /> : <Login />}
    </div>
  );
}

// Root App with Providers
const RootApp = () => {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
};

export default RootApp;