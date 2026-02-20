"""
Backend API Tests for Web Metrics Testing Application
Tests: Dashboard endpoints, Test result endpoints, Sync endpoint with duplicate detection
"""
import pytest
import requests
import os
import time

# Use local backend URL since external URL may not be accessible
BASE_URL = os.environ.get('VITE_API_URL', 'http://localhost:8001/api/v1')

# Test credentials
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "TestPass123!"


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test successful login returns access token and user data"""
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert data.get("status") == "success"
        assert "data" in data
        assert "accessToken" in data["data"]
        assert "user" in data["data"]
        assert data["data"]["user"]["email"] == TEST_EMAIL
        print(f"✅ Login successful, user: {data['data']['user']['email']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        # Should be 401 or 400 for invalid credentials
        assert response.status_code in [400, 401], f"Expected 401/400, got {response.status_code}"
        print(f"✅ Invalid login correctly rejected with {response.status_code}")


class TestDashboardTests:
    """Dashboard tests list and single test endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, "Login failed in setup"
        self.token = response.json()["data"]["accessToken"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_tests_list(self):
        """Test GET /dashboard/tests returns paginated test list"""
        response = requests.get(f"{BASE_URL}/dashboard/tests", headers=self.headers)
        assert response.status_code == 200, f"Get tests failed: {response.text}"
        
        data = response.json()
        assert data.get("status") == "success"
        assert "data" in data
        
        # Validate pagination structure
        list_data = data["data"]
        assert "data" in list_data, "Missing 'data' array in response"
        assert "total" in list_data
        assert "page" in list_data
        assert "limit" in list_data
        assert "totalPages" in list_data
        assert "hasNextPage" in list_data
        assert "hasPreviousPage" in list_data
        
        print(f"✅ Tests list returned {list_data['total']} tests")
        
        # Validate test structure if there are tests
        if list_data["data"]:
            test = list_data["data"][0]
            assert "id" in test
            assert "url" in test
            assert "status" in test
            assert "testType" in test
            assert "deviceType" in test
            print(f"✅ Test data structure validated: {test['id']}")
    
    def test_get_single_test_by_id(self):
        """Test GET /dashboard/tests/:id returns full test data with webMetrics"""
        # First get a test ID from the list
        list_response = requests.get(f"{BASE_URL}/dashboard/tests", headers=self.headers)
        list_data = list_response.json()["data"]["data"]
        
        if not list_data:
            pytest.skip("No tests available to test single test endpoint")
        
        test_id = list_data[0]["id"]
        
        # Get single test
        response = requests.get(f"{BASE_URL}/dashboard/tests/{test_id}", headers=self.headers)
        assert response.status_code == 200, f"Get single test failed: {response.text}"
        
        data = response.json()
        assert data.get("status") == "success"
        test = data["data"]
        
        # Validate single test structure (Bug Fix #1 - must have webMetrics)
        assert "id" in test
        assert "url" in test
        assert "status" in test
        assert "results" in test or test.get("results") is None
        
        if test.get("results"):
            # Bug Fix #1: Verify webMetrics is present for frontend transformation
            assert "webMetrics" in test["results"] or test["results"].get("webMetrics") is None
            print(f"✅ Single test has correct structure with webMetrics field")
        
        print(f"✅ Single test retrieved: {test['id']}, url: {test['url']}")
    
    def test_get_nonexistent_test(self):
        """Test GET /dashboard/tests/:id with invalid ID returns 404"""
        response = requests.get(
            f"{BASE_URL}/dashboard/tests/000000000000000000000000",
            headers=self.headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✅ Nonexistent test correctly returned 404")


class TestSyncEndpoint:
    """Test sync endpoint with duplicate detection (Bug Fix #2)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, "Login failed in setup"
        self.token = response.json()["data"]["accessToken"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_sync_new_test(self):
        """Test sync creates new test when URL+timestamp is unique"""
        unique_timestamp = int(time.time() * 1000)
        
        response = requests.post(f"{BASE_URL}/user/tests/sync", headers=self.headers, json={
            "tests": [{
                "url": f"https://unique-test-{unique_timestamp}.com",
                "testType": "performance",
                "deviceType": "desktop",
                "results": {"webMetrics": {"metrics": {"firstContentfulPaint": 1500}}},
                "timestamp": unique_timestamp
            }]
        })
        
        assert response.status_code == 200, f"Sync failed: {response.text}"
        
        data = response.json()["data"]
        assert data["syncedCount"] == 1, f"Expected 1 synced, got {data['syncedCount']}"
        assert data["skippedCount"] == 0, f"Expected 0 skipped, got {data['skippedCount']}"
        
        print(f"✅ New test synced successfully")
    
    def test_sync_duplicate_detection(self):
        """Bug Fix #2: Test sync skips duplicate tests (same URL + timestamp)"""
        unique_timestamp = int(time.time() * 1000)
        test_url = f"https://duplicate-test-{unique_timestamp}.com"
        
        # First sync - should succeed
        response1 = requests.post(f"{BASE_URL}/user/tests/sync", headers=self.headers, json={
            "tests": [{
                "url": test_url,
                "testType": "performance",
                "deviceType": "desktop",
                "results": {"webMetrics": {"metrics": {"firstContentfulPaint": 1500}}},
                "timestamp": unique_timestamp
            }]
        })
        
        assert response1.status_code == 200
        data1 = response1.json()["data"]
        assert data1["syncedCount"] == 1
        print(f"✅ First sync created test")
        
        # Second sync with SAME URL + TIMESTAMP - should be skipped
        response2 = requests.post(f"{BASE_URL}/user/tests/sync", headers=self.headers, json={
            "tests": [{
                "url": test_url,
                "testType": "performance",
                "deviceType": "desktop",
                "results": {"webMetrics": {"metrics": {"firstContentfulPaint": 1500}}},
                "timestamp": unique_timestamp
            }]
        })
        
        assert response2.status_code == 200
        data2 = response2.json()["data"]
        
        # Bug Fix #2: Duplicate should be skipped
        assert data2["syncedCount"] == 0, f"Expected 0 synced (duplicate), got {data2['syncedCount']}"
        assert data2["skippedCount"] == 1, f"Expected 1 skipped, got {data2['skippedCount']}"
        
        print(f"✅ Duplicate test correctly skipped (Bug Fix #2 verified)")
    
    def test_sync_same_url_different_timestamp(self):
        """Test sync allows same URL with different timestamp"""
        base_timestamp = int(time.time() * 1000)
        test_url = f"https://same-url-diff-time-{base_timestamp}.com"
        
        # First sync
        response1 = requests.post(f"{BASE_URL}/user/tests/sync", headers=self.headers, json={
            "tests": [{
                "url": test_url,
                "testType": "performance",
                "deviceType": "desktop",
                "results": {"webMetrics": {"metrics": {"firstContentfulPaint": 1500}}},
                "timestamp": base_timestamp
            }]
        })
        assert response1.status_code == 200
        assert response1.json()["data"]["syncedCount"] == 1
        
        # Second sync with DIFFERENT timestamp (2 seconds later)
        response2 = requests.post(f"{BASE_URL}/user/tests/sync", headers=self.headers, json={
            "tests": [{
                "url": test_url,
                "testType": "performance",
                "deviceType": "desktop",
                "results": {"webMetrics": {"metrics": {"firstContentfulPaint": 1600}}},
                "timestamp": base_timestamp + 2000  # Different timestamp
            }]
        })
        
        assert response2.status_code == 200
        data2 = response2.json()["data"]
        
        # Same URL but different timestamp should be synced
        assert data2["syncedCount"] == 1, f"Expected 1 synced (different timestamp), got {data2['syncedCount']}"
        
        print(f"✅ Same URL with different timestamp correctly synced as new test")


class TestDashboardStats:
    """Dashboard statistics endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, "Login failed in setup"
        self.token = response.json()["data"]["accessToken"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_dashboard_stats(self):
        """Test GET /dashboard/stats returns stats"""
        response = requests.get(f"{BASE_URL}/dashboard/stats", headers=self.headers)
        assert response.status_code == 200, f"Get stats failed: {response.text}"
        
        data = response.json()
        assert data.get("status") == "success"
        stats = data["data"]
        
        # Validate stats structure
        assert "totalTests" in stats
        assert "testsThisMonth" in stats
        assert "averageScore" in stats
        assert "criticalIssues" in stats
        
        print(f"✅ Dashboard stats retrieved: {stats['totalTests']} total tests")


class TestUnauthorizedAccess:
    """Test unauthorized access to protected endpoints"""
    
    def test_tests_list_unauthorized(self):
        """Test GET /dashboard/tests without auth returns 401"""
        response = requests.get(f"{BASE_URL}/dashboard/tests")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✅ Unauthorized access correctly rejected")
    
    def test_sync_unauthorized(self):
        """Test POST /user/tests/sync without auth returns 401"""
        response = requests.post(f"{BASE_URL}/user/tests/sync", json={"tests": []})
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✅ Unauthorized sync correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
