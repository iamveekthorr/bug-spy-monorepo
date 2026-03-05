import pytest
import requests
import os

BASE_URL = os.environ.get('VITE_API_URL', 'https://lighthouse-reports.preview.emergentagent.com/api/v1')

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def auth_token(api_client):
    """Get authentication token"""
    response = api_client.post(f"{BASE_URL}/auth/login", json={
        "email": "test@example.com",
        "password": "TestPass123!"
    })
    if response.status_code == 200:
        return response.json().get("data", {}).get("accessToken")
    pytest.skip("Authentication failed — skipping authenticated tests")

@pytest.fixture
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestAuthAPI:
    """Authentication API tests"""
    
    def test_login_with_valid_credentials(self, api_client):
        """Test login with valid credentials returns token"""
        response = api_client.post(f"{BASE_URL}/auth/login", json={
            "email": "test@example.com",
            "password": "TestPass123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "success"
        assert "accessToken" in data.get("data", {})
        assert "user" in data.get("data", {})

    def test_login_with_invalid_credentials(self, api_client):
        """Test login with invalid credentials fails"""
        response = api_client.post(f"{BASE_URL}/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code in [401, 400]


class TestDashboardAPI:
    """Dashboard API tests"""
    
    def test_get_dashboard_stats(self, authenticated_client):
        """Test getting dashboard stats"""
        response = authenticated_client.get(f"{BASE_URL}/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "success"
        stats = data.get("data", {})
        # Verify key metrics are present
        assert "totalTests" in stats
        assert "averageScore" in stats
        assert "criticalIssues" in stats
        assert "testsThisMonth" in stats

    def test_get_dashboard_tests(self, authenticated_client):
        """Test getting dashboard tests list"""
        response = authenticated_client.get(f"{BASE_URL}/dashboard/tests")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "success"
        # Response has nested data structure with pagination
        tests_data = data.get("data", {})
        assert "data" in tests_data  # tests array
        assert "page" in tests_data
        assert "hasNextPage" in tests_data

    def test_get_dashboard_schedules(self, authenticated_client):
        """Test getting dashboard schedules"""
        response = authenticated_client.get(f"{BASE_URL}/dashboard/schedules")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "success"


class TestAnalyticsAPI:
    """Analytics API tests"""
    
    def test_get_analytics_performance(self, authenticated_client):
        """Test getting analytics performance data"""
        response = authenticated_client.get(f"{BASE_URL}/dashboard/analytics/performance?period=month")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "success"
        analytics = data.get("data", {})
        # Verify key analytics fields
        assert "averagePerformanceScore" in analytics
        assert "totalTests" in analytics
        assert "startDate" in analytics
        assert "endDate" in analytics

    def test_get_dashboard_stats_unauthenticated(self, api_client):
        """Test that dashboard stats requires authentication"""
        response = api_client.get(f"{BASE_URL}/dashboard/stats")
        # Should return 401 Unauthorized
        assert response.status_code == 401
