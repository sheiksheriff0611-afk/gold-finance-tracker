import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gold_tracker.settings')
django.setup()

from rest_framework.test import APIClient
from accounts.models import User

def test_shift():
    client = APIClient()
    exec1 = User.objects.get(username='executive1')
    client.force_authenticate(user=exec1)

    # 1. Start Work
    r = client.post('/api/tracking/toggle-work/', {
        'action': 'START',
        'latitude': 13.0425,
        'longitude': 80.2350,
        'notes': 'Starting Morning Shift',
        'battery': 98
    }, format='json')
    assert r.status_code == 200
    print("✓ Start Work passed:", r.data['message'])

    # 2. Check Active Shift
    r = client.get('/api/tracking/active-shift/')
    assert r.status_code == 200
    assert r.data['is_active'] is True
    print("✓ Active Shift Details passed. Elapsed seconds:", r.data['shift']['elapsed_seconds'])

    # 3. Check Breadcrumbs with visits
    r = client.get(f'/api/tracking/breadcrumbs/{exec1.id}/')
    assert r.status_code == 200
    assert 'breadcrumbs' in r.data
    assert 'visits' in r.data
    assert 'gold_collections' in r.data
    assert 'cash_collections' in r.data
    print("✓ Breadcrumbs with visits & collections passed. Pings count:", len(r.data['breadcrumbs']))

    # 4. Check Shift History
    r = client.get('/api/tracking/shifts/')
    assert r.status_code == 200
    print("✓ Shift History passed. Total shifts:", len(r.data))

    print("\nALL TRACKING & SHIFT BACKEND TESTS PASSED!")

if __name__ == '__main__':
    test_shift()

