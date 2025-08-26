# backend/core/tests.py
from django.test import TestCase
from django.urls import reverse

class HealthCheckTest(TestCase):
    def test_basic_functionality(self):
        """Test that Django is working"""
        self.assertTrue(True)