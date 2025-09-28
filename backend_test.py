#!/usr/bin/env python3
"""
Security Assessment App Backend API Testing
Tests the complete assessment workflow from registration to results.
"""

import requests
import json
import uuid
from datetime import datetime

# Configuration
BASE_URL = "https://secassess-1.preview.emergentagent.com/api"
TEST_USER_EMAIL = f"testuser_{uuid.uuid4().hex[:8]}@example.com"
TEST_USER_PASSWORD = "SecurePass123!"

class SecurityAssessmentTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.auth_token = None
        self.user_data = None
        self.domains = []
        self.questions = []
        self.assessment_id = None
        
    def log(self, message, status="INFO"):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {status}: {message}")
        
    def test_api_health(self):
        """Test if the API is running"""
        try:
            response = self.session.get(f"{self.base_url}/")
            if response.status_code == 200:
                self.log("✅ API health check passed")
                return True
            else:
                self.log(f"❌ API health check failed: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ API health check failed: {str(e)}", "ERROR")
            return False
    
    def test_user_registration(self):
        """Test user registration endpoint"""
        try:
            user_data = {
                "first_name": "John",
                "last_name": "Doe",
                "organization_name": "Test Security Corp",
                "email": TEST_USER_EMAIL,
                "corporate_email": f"corporate_{TEST_USER_EMAIL}",
                "designation": "Security Analyst",
                "contact_number": "+1234567890",
                "password": TEST_USER_PASSWORD
            }
            
            response = self.session.post(f"{self.base_url}/auth/register", json=user_data)
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data and "user" in data:
                    self.auth_token = data["token"]
                    self.user_data = data["user"]
                    self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
                    self.log(f"✅ User registration successful - User ID: {self.user_data['id']}")
                    return True
                else:
                    self.log(f"❌ Registration response missing required fields: {data}", "ERROR")
                    return False
            else:
                self.log(f"❌ User registration failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ User registration error: {str(e)}", "ERROR")
            return False
    
    def test_user_login(self):
        """Test user login endpoint"""
        try:
            login_data = {
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD
            }
            
            response = self.session.post(f"{self.base_url}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data and "user" in data:
                    # Update token in case it's different
                    self.auth_token = data["token"]
                    self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
                    self.log(f"✅ User login successful - Email: {data['user']['email']}")
                    return True
                else:
                    self.log(f"❌ Login response missing required fields: {data}", "ERROR")
                    return False
            else:
                self.log(f"❌ User login failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ User login error: {str(e)}", "ERROR")
            return False
    
    def test_get_domains(self):
        """Test domains retrieval endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/domains")
            
            if response.status_code == 200:
                domains = response.json()
                if isinstance(domains, list) and len(domains) > 0:
                    self.domains = domains
                    self.log(f"✅ Domains retrieved successfully - Count: {len(domains)}")
                    
                    # Verify domain structure
                    first_domain = domains[0]
                    required_fields = ["id", "name", "order"]
                    if all(field in first_domain for field in required_fields):
                        self.log(f"✅ Domain structure validated - First domain: {first_domain['name']}")
                        return True
                    else:
                        self.log(f"❌ Domain missing required fields: {first_domain}", "ERROR")
                        return False
                else:
                    self.log("❌ No domains found or invalid response format", "ERROR")
                    return False
            else:
                self.log(f"❌ Get domains failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get domains error: {str(e)}", "ERROR")
            return False
    
    def test_get_domain_questions(self):
        """Test questions retrieval for first domain"""
        try:
            if not self.domains:
                self.log("❌ No domains available for testing questions", "ERROR")
                return False
                
            first_domain = self.domains[0]
            domain_id = first_domain["id"]
            
            response = self.session.get(f"{self.base_url}/domains/{domain_id}/questions")
            
            if response.status_code == 200:
                questions = response.json()
                if isinstance(questions, list) and len(questions) > 0:
                    self.questions = questions
                    self.log(f"✅ Questions retrieved successfully - Count: {len(questions)} for domain: {first_domain['name']}")
                    
                    # Verify question structure
                    first_question = questions[0]
                    required_fields = ["id", "question_text", "answers", "domain_id"]
                    if all(field in first_question for field in required_fields):
                        answers = first_question["answers"]
                        if isinstance(answers, list) and len(answers) > 0:
                            self.log(f"✅ Question structure validated - Answers count: {len(answers)}")
                            return True
                        else:
                            self.log("❌ Question has no answers", "ERROR")
                            return False
                    else:
                        self.log(f"❌ Question missing required fields: {first_question}", "ERROR")
                        return False
                else:
                    self.log(f"❌ No questions found for domain {first_domain['name']}", "ERROR")
                    return False
            else:
                self.log(f"❌ Get domain questions failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get domain questions error: {str(e)}", "ERROR")
            return False
    
    def test_submit_assessment(self):
        """Test assessment submission with sample responses"""
        try:
            if not self.questions:
                self.log("❌ No questions available for assessment submission", "ERROR")
                return False
            
            # Create sample responses - select middle answers (score 2-3)
            responses = []
            for question in self.questions:
                answers = question["answers"]
                if len(answers) >= 3:
                    # Select middle answer for variety
                    selected_answer = answers[len(answers) // 2]
                    responses.append({
                        "question_id": question["id"],
                        "selected_answer_id": selected_answer["id"]
                    })
            
            if not responses:
                self.log("❌ No valid responses could be created", "ERROR")
                return False
            
            submission_data = {"responses": responses}
            
            response = self.session.post(f"{self.base_url}/assessments/submit", json=submission_data)
            
            if response.status_code == 200:
                data = response.json()
                if "assessment_id" in data and "message" in data:
                    self.assessment_id = data["assessment_id"]
                    self.log(f"✅ Assessment submitted successfully - ID: {self.assessment_id}")
                    self.log(f"✅ Submitted {len(responses)} responses")
                    return True
                else:
                    self.log(f"❌ Assessment submission response missing required fields: {data}", "ERROR")
                    return False
            else:
                self.log(f"❌ Assessment submission failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Assessment submission error: {str(e)}", "ERROR")
            return False
    
    def test_get_user_assessments(self):
        """Test user assessments retrieval"""
        try:
            response = self.session.get(f"{self.base_url}/assessments/my-assessments")
            
            if response.status_code == 200:
                assessments = response.json()
                if isinstance(assessments, list):
                    self.log(f"✅ User assessments retrieved successfully - Count: {len(assessments)}")
                    
                    if len(assessments) > 0:
                        # Verify assessment structure
                        first_assessment = assessments[0]
                        required_fields = ["id", "user_id", "submission_date", "status"]
                        if all(field in first_assessment for field in required_fields):
                            self.log("✅ Assessment structure validated")
                            return True
                        else:
                            self.log(f"❌ Assessment missing required fields: {first_assessment}", "ERROR")
                            return False
                    else:
                        self.log("⚠️ No assessments found for user", "WARNING")
                        return True  # This is acceptable for a new user
                else:
                    self.log(f"❌ Invalid assessments response format: {assessments}", "ERROR")
                    return False
            else:
                self.log(f"❌ Get user assessments failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get user assessments error: {str(e)}", "ERROR")
            return False
    
    def test_get_assessment_stats(self):
        """Test assessment statistics retrieval"""
        try:
            if not self.assessment_id:
                self.log("❌ No assessment ID available for stats testing", "ERROR")
                return False
            
            response = self.session.get(f"{self.base_url}/dashboard/stats/{self.assessment_id}")
            
            if response.status_code == 200:
                stats = response.json()
                required_fields = ["total_responses", "domains_completed", "overall_average"]
                if all(field in stats for field in required_fields):
                    self.log(f"✅ Assessment stats retrieved successfully")
                    self.log(f"   - Total responses: {stats['total_responses']}")
                    self.log(f"   - Domains completed: {stats['domains_completed']}")
                    self.log(f"   - Overall average: {stats['overall_average']}")
                    
                    # Validate stats make sense
                    if (stats["total_responses"] > 0 and 
                        stats["domains_completed"] > 0 and 
                        0 <= stats["overall_average"] <= 5):
                        self.log("✅ Assessment stats validation passed")
                        return True
                    else:
                        self.log(f"❌ Assessment stats values seem invalid: {stats}", "ERROR")
                        return False
                else:
                    self.log(f"❌ Assessment stats missing required fields: {stats}", "ERROR")
                    return False
            else:
                self.log(f"❌ Get assessment stats failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get assessment stats error: {str(e)}", "ERROR")
            return False
    
    def test_admin_login(self):
        """Test admin user login with default credentials"""
        try:
            login_data = {
                "email": "admin@secassess.com",
                "password": "admin123"
            }
            
            response = self.session.post(f"{self.base_url}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data and "user" in data:
                    if data["user"]["role"] == "admin":
                        self.log(f"✅ Admin login successful - Role: {data['user']['role']}")
                        return True
                    else:
                        self.log(f"❌ Admin login failed - Expected admin role, got: {data['user']['role']}", "ERROR")
                        return False
                else:
                    self.log(f"❌ Admin login response missing required fields: {data}", "ERROR")
                    return False
            else:
                self.log(f"❌ Admin login failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Admin login error: {str(e)}", "ERROR")
            return False
    
    def test_data_initialization(self):
        """Test sample data initialization endpoint"""
        try:
            response = self.session.post(f"{self.base_url}/admin/init-data")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log(f"✅ Data initialization endpoint working - Message: {data['message']}")
                    return True
                else:
                    self.log(f"❌ Data initialization response missing message: {data}", "ERROR")
                    return False
            else:
                self.log(f"❌ Data initialization failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Data initialization error: {str(e)}", "ERROR")
            return False
    
    def test_authentication_middleware(self):
        """Test that protected endpoints require authentication"""
        try:
            # Remove auth header temporarily
            original_headers = self.session.headers.copy()
            if "Authorization" in self.session.headers:
                del self.session.headers["Authorization"]
            
            # Try to access protected endpoint
            response = self.session.get(f"{self.base_url}/assessments/my-assessments")
            
            # Restore headers
            self.session.headers = original_headers
            
            if response.status_code in [401, 403]:
                self.log(f"✅ Authentication middleware working - Unauthorized access blocked (HTTP {response.status_code})")
                return True
            else:
                self.log(f"❌ Authentication middleware failed - Expected 401/403, got {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Authentication middleware test error: {str(e)}", "ERROR")
            return False
    
    def run_all_tests(self):
        """Run all backend tests in sequence"""
        self.log("🚀 Starting Security Assessment App Backend Testing")
        self.log(f"🔗 Testing against: {self.base_url}")
        self.log(f"👤 Test user email: {TEST_USER_EMAIL}")
        
        tests = [
            ("API Health Check", self.test_api_health),
            ("Data Initialization", self.test_data_initialization),
            ("Admin Login", self.test_admin_login),
            ("User Registration", self.test_user_registration),
            ("User Login", self.test_user_login),
            ("Authentication Middleware", self.test_authentication_middleware),
            ("Get Domains", self.test_get_domains),
            ("Get Domain Questions", self.test_get_domain_questions),
            ("Submit Assessment", self.test_submit_assessment),
            ("Get User Assessments", self.test_get_user_assessments),
            ("Get Assessment Stats", self.test_get_assessment_stats),
        ]
        
        results = {}
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            self.log(f"\n📋 Running: {test_name}")
            try:
                result = test_func()
                results[test_name] = result
                if result:
                    passed += 1
                    self.log(f"✅ {test_name} PASSED")
                else:
                    self.log(f"❌ {test_name} FAILED")
            except Exception as e:
                self.log(f"❌ {test_name} ERROR: {str(e)}", "ERROR")
                results[test_name] = False
        
        # Summary
        self.log(f"\n📊 TEST SUMMARY")
        self.log(f"{'='*50}")
        self.log(f"Total Tests: {total}")
        self.log(f"Passed: {passed}")
        self.log(f"Failed: {total - passed}")
        self.log(f"Success Rate: {(passed/total)*100:.1f}%")
        
        # Detailed results
        self.log(f"\n📋 DETAILED RESULTS")
        self.log(f"{'='*50}")
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{test_name}: {status}")
        
        return results

if __name__ == "__main__":
    tester = SecurityAssessmentTester()
    results = tester.run_all_tests()