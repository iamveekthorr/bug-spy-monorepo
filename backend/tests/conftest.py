import pytest
import os

# Configure pytest
def pytest_configure(config):
    """Configure test environment"""
    os.environ.setdefault('VITE_API_URL', 'https://lighthouse-reports.preview.emergentagent.com/api/v1')
