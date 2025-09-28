import React, { useState, useEffect, useContext, createContext } from 'react';
import './App.css';
import axios from 'axios';

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
      // You could verify the token here
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

// Dashboard Component
const Dashboard = () => {
  const [assessments, setAssessments] = useState([]);
  const [currentAssessment, setCurrentAssessment] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();

  useEffect(() => {
    loadAssessments();
  }, []);

  useEffect(() => {
    if (assessments.length > 0 && !currentAssessment) {
      // Load latest assessment by default
      setCurrentAssessment(assessments[0]);
    }
  }, [assessments]);

  useEffect(() => {
    if (currentAssessment) {
      loadAssessmentStats(currentAssessment.id);
    }
  }, [currentAssessment]);

  const loadAssessments = async () => {
    try {
      const response = await axios.get(`${API}/assessments/my-assessments`);
      setAssessments(response.data);
    } catch (error) {
      console.error('Error loading assessments:', error);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (assessments.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-12 px-4">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Assessment Dashboard</h1>
            <p className="text-gray-600 mb-8">Please take an assessment to see your results.</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Take Assessment
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Assessment Dashboard</h1>
          <p className="text-gray-600 mb-4">A comprehensive overview of your assessment progress and insights.</p>
          
          {/* Assessment Selector */}
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
        </div>

        {stats && (
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
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Overview Graph
              </button>
              <button className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                Analytics
              </button>
              <button className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                Export PDF
              </button>
            </div>

            {/* Overall Assessment Score Bar */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
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

            {/* Placeholder for additional analytics */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Assessment Analysis</h3>
              <p className="text-gray-600">
                Your assessment has been successfully completed and recorded. 
                Advanced analytics including domain-specific breakdowns, radar charts, and detailed control analysis will be available in the next update.
              </p>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <span className="text-blue-600 mr-2">📊</span>
                  <div>
                    <div className="font-medium text-blue-900">Assessment Complete</div>
                    <div className="text-sm text-blue-700">
                      Score: {stats.overall_average}/5 • Questions: {stats.total_responses} • Domains: {stats.domains_completed}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Assessment Component
const Assessment = () => {
  const [domains, setDomains] = useState([]);
  const [currentDomainIndex, setCurrentDomainIndex] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    loadDomains();
  }, []);

  useEffect(() => {
    if (domains.length > 0) {
      loadQuestionsForDomain(domains[currentDomainIndex].id);
    }
  }, [currentDomainIndex, domains]);

  const loadDomains = async () => {
    try {
      const response = await axios.get(`${API}/domains`);
      setDomains(response.data);
    } catch (error) {
      console.error('Error loading domains:', error);
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

  const canProceedToNext = () => {
    const progress = getProgressForCurrentDomain();
    return progress.answered === progress.total;
  };

  const handleNext = () => {
    if (currentDomainIndex < domains.length - 1) {
      setCurrentDomainIndex(currentDomainIndex + 1);
    } else {
      submitAssessment();
    }
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

      const response = await axios.post(`${API}/assessments/submit`, submissionData);
      console.log('Assessment submitted successfully:', response.data);
      
      // Redirect to dashboard
      setCurrentPage('dashboard');
    } catch (error) {
      console.error('Error submitting assessment:', error);
      alert('Error submitting assessment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const progress = getProgressForCurrentDomain();
  const isLastDomain = currentDomainIndex === domains.length - 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Security Assessment</h1>
            <p className="text-gray-600">Welcome, {user?.email}</p>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-600 hover:text-gray-900">
              <span>⚙️</span>
            </button>
            <button className="p-2 text-gray-600 hover:text-gray-900">
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
        {/* Left Navigation Panel */}
        <nav className="w-64 bg-white shadow-sm h-screen sticky top-0 border-r">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Domains</h2>
            <div className="space-y-2">
              {domains.map((domain, index) => (
                <div
                  key={domain.id}
                  className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                    index === currentDomainIndex
                      ? 'bg-blue-100 text-blue-800 border-l-4 border-blue-600'
                      : index < currentDomainIndex
                      ? 'bg-green-50 text-green-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => setCurrentDomainIndex(index)}
                >
                  <span className="mr-3 text-xl">{domain.icon}</span>
                  <span className="font-medium">{domain.name}</span>
                  {index < currentDomainIndex && (
                    <span className="ml-auto text-green-600">✓</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 p-6">
          {domains.length > 0 && (
            <div className="max-w-4xl mx-auto">
              {/* Domain Header */}
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  {domains[currentDomainIndex]?.name}
                </h2>
                
                {/* Progress Tracking */}
                <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Questions Answered: {progress.answered}/{progress.total}
                    </span>
                    <span className="text-sm text-gray-500">
                      {Math.round(progress.percentage)}% Complete
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Questions */}
              {loading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-gray-600">Loading questions...</p>
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
                            <span className="ml-3 text-gray-900">{answer.answer_text}</span>
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
                  
                  {/* Next Button */}
                  <div className="text-center pt-6">
                    <button
                      onClick={handleNext}
                      disabled={!canProceedToNext() || submitting}
                      className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                        canProceedToNext() && !submitting
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {submitting ? (
                        'Submitting...'
                      ) : isLastDomain ? (
                        'View Results'
                      ) : (
                        'Next Domain'
                      )}
                    </button>
                  </div>
                </div>
              )}
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
      {user ? <Assessment /> : <Login />}
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