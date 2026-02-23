# backend/core/tests.py
from django.test import TestCase


class HealthCheckTest(TestCase):
    def test_basic_functionality(self):
        """Test that Django is working"""
        self.assertTrue(True)
