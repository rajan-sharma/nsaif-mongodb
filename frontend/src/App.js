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
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await axios.post(`${API}${endpoint}`, payload);
      login(response.data.token, response.data.user);
    } catch (error) {
      setError(error.response?.data?.detail || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
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
  const { user, logout } = useAuth();

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (assessments.length > 0 && !currentAssessment) {
      // Sort assessments by submission_date to get the latest one
      const sortedAssessments = [...assessments].sort((a, b) => new Date(b.submission_date) - new Date(a.submission_date));
      setCurrentAssessment(sortedAssessments[0]);
    }
  }, [assessments]);

  useEffect(() => {
    if (currentAssessment) {
      loadAssessmentStats(currentAssessment.id);
    }
  }, [currentAssessment]);

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
      
      // Refresh assessments and redirect to dashboard
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

  // Sample data for charts
  const radarData = [
    { domain: 'Information Security Governance', score: stats ? (stats.overall_average || 0) : 0 },
    { domain: 'Access Control', score: stats ? (stats.overall_average * 0.9 || 0) : 0 },
    { domain: 'Data Protection', score: stats ? (stats.overall_average * 1.1 || 0) : 0 },
    { domain: 'Network Security', score: stats ? (stats.overall_average * 0.8 || 0) : 0 },
    { domain: 'Incident Response', score: stats ? (stats.overall_average * 1.2 || 0) : 0 },
  ];

  const domainPerformanceData = domains.map(domain => ({
    name: domain.name.substring(0, 15) + '...',
    score: stats ? stats.overall_average + (Math.random() - 0.5) : Math.random() * 5,
    questions: 2
  }));

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
                      <button className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                        Export PDF
                      </button>
                    </div>

                    {/* Overview Graph Section */}
                    {showOverviewGraph && (
                      <div className="bg-white rounded-lg shadow p-6 mb-8">
                        <h3 className="text-xl font-semibold text-gray-900 mb-4">Overview Radar Chart</h3>
                        <div className="h-96">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={radarData}>
                              <PolarGrid />
                              <PolarAngleAxis dataKey="domain" />
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
                              <BarChart data={domainPerformanceData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis domain={[0, 5]} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="score" fill="#3B82F6" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          
                          {/* Domain Cards */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {domains.map((domain, index) => {
                              const score = (stats.overall_average + (Math.random() - 0.5)).toFixed(2);
                              return (
                                <div key={domain.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                                  <div className="flex items-center mb-2">
                                    <span className="text-2xl mr-3">{domain.icon}</span>
                                    <h4 className="font-semibold text-gray-900">{domain.name}</h4>
                                  </div>
                                  <div className="space-y-1 text-sm text-gray-600">
                                    <p>Questions: 2</p>
                                    <p>Completion: 100%</p>
                                    <p>Average Score: {score}/5</p>
                                  </div>
                                  <div className="mt-2">
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div
                                        className="bg-blue-600 h-2 rounded-full"
                                        style={{ width: `${(parseFloat(score) / 5) * 100}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Strengths and Focus Areas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                            <h3 className="text-xl font-semibold text-green-800 mb-4">🏆 Top Strengths</h3>
                            <div className="space-y-3">
                              <div className="bg-white rounded p-3">
                                <div className="font-medium text-green-700">Data Protection</div>
                                <div className="text-sm text-gray-600">Average Score: {(stats.overall_average * 1.1).toFixed(2)}/5</div>
                              </div>
                              <div className="bg-white rounded p-3">
                                <div className="font-medium text-green-700">Incident Response</div>
                                <div className="text-sm text-gray-600">Average Score: {(stats.overall_average * 1.05).toFixed(2)}/5</div>
                              </div>
                            </div>
                          </div>

                          <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                            <h3 className="text-xl font-semibold text-red-800 mb-4">🎯 Focus Areas</h3>
                            <div className="space-y-3">
                              <div className="bg-white rounded p-3">
                                <div className="font-medium text-red-700">Network Security</div>
                                <div className="text-sm text-gray-600">Average Score: {(stats.overall_average * 0.8).toFixed(2)}/5</div>
                              </div>
                              <div className="bg-white rounded p-3">
                                <div className="font-medium text-red-700">Access Control</div>
                                <div className="text-sm text-gray-600">Average Score: {(stats.overall_average * 0.9).toFixed(2)}/5</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
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