import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gold_tracker.settings')
django.setup()

from rest_framework.test import APIClient
from accounts.models import User

def test_endpoints():
    client = APIClient()

    # 1. Test Admin Login
    print("Testing Admin Login...")
    resp = client.post('/api/accounts/login/', {'username': 'admin', 'password': 'admin123'}, format='json')
    assert resp.status_code == 200, f"Admin login failed: {resp.content}"
    admin_token = resp.data['access']
    print("✓ Admin Login passed. Role:", resp.data['user']['role'])

    # 2. Test Dashboard Stats as Admin
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {admin_token}')
    resp = client.get('/api/accounts/dashboard-stats/')
    assert resp.status_code == 200, f"Dashboard stats failed: {resp.content}"
    print("✓ Dashboard Stats passed:", resp.data.keys(), "Total gold grams:", resp.data['total_gold_grams'])

    # 3. Test Live Locations
    resp = client.get('/api/tracking/live-locations/')
    assert resp.status_code == 200, f"Live locations failed: {resp.content}"
    print("✓ Live Locations passed. Count:", len(resp.data))

    # 4. Test Gold Collections
    resp = client.get('/api/collections/gold/')
    assert resp.status_code == 200, f"Gold collections failed: {resp.content}"
    print("✓ Gold Collections passed. Count:", resp.data.get('count', len(resp.data)))

    # 5. Test Cash Collections
    resp = client.get('/api/collections/cash/')
    assert resp.status_code == 200, f"Cash collections failed: {resp.content}"
    print("✓ Cash Collections passed. Count:", resp.data.get('count', len(resp.data)))

    # 6. Test Reports
    resp = client.get('/api/reports/data/?type=daily_gold')
    assert resp.status_code == 200, f"Reports failed: {resp.content}"
    print("✓ Daily Gold Report passed. Total grams:", resp.data['totals']['weight_grams'])

    # 7. Test Sales Executive Shift Toggle
    exec_user = User.objects.get(username='executive1')
    client.force_authenticate(user=exec_user)
    resp = client.post('/api/tracking/toggle-work/', {
        'action': 'START',
        'latitude': 13.0425,
        'longitude': 80.2350,
        'notes': 'Field visit testing',
        'battery': 95
    }, format='json')
    assert resp.status_code == 200, f"Toggle work failed: {resp.content}"
    print("✓ Sales Executive Work Toggle passed:", resp.data['message'])

    print("\nALL BACKEND API TESTS PASSED SUCCESSFULLY! 100% OPERATIONAL.")

if __name__ == '__main__':
    test_endpoints()

