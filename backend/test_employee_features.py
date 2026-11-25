import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gold_tracker.settings')
django.setup()

from rest_framework.test import APIClient
from accounts.models import User

def test_features():
    client = APIClient()
    admin = User.objects.get(username='admin')
    client.force_authenticate(user=admin)

    # 1. Test Coordinator Workload
    r = client.get('/api/accounts/coordinator-workload/')
    assert r.status_code == 200, f"Coordinator workload failed: {r.content}"
    print("✓ Coordinator Workload API passed. Coordinators count:", len(r.data['coordinators']))

    # 2. Test Employee History
    exec1 = User.objects.get(username='executive1')
    r = client.get(f'/api/accounts/history/{exec1.id}/')
    assert r.status_code == 200, f"Employee history failed: {r.content}"
    print("✓ Employee History API passed. Total gold grams:", r.data['metrics']['total_gold_grams'])

    # 3. Test Reassign Coordinator
    coord2 = User.objects.get(username='coordinator2')
    r = client.post('/api/accounts/reassign-coordinator/', {
        'employee_ids': [exec1.id],
        'coordinator_id': coord2.id
    }, format='json')
    assert r.status_code == 200
    exec1.refresh_from_db()
    assert exec1.assigned_coordinator == coord2
    print("✓ Reassign Coordinator API passed. Assigned to:", exec1.assigned_coordinator.username)

    # Reassign back to coord1
    coord1 = User.objects.get(username='coordinator1')
    client.post('/api/accounts/reassign-coordinator/', {
        'employee_ids': [exec1.id],
        'coordinator_id': coord1.id
    }, format='json')

    # 4. Test Self Profile Update
    client.force_authenticate(user=exec1)
    r = client.patch('/api/accounts/profile/', {
        'phone': '+91 97890 99999',
        'emergency_contact': '+91 99999 11111',
        'pan_or_aadhaar': 'ABCDE1234F'
    }, format='json')
    assert r.status_code == 200
    exec1.refresh_from_db()
    assert exec1.emergency_contact == '+91 99999 11111'
    print("✓ Profile Update API passed. Emergency contact:", exec1.emergency_contact)

    print("\nALL EMPLOYEE & PROFILE MANAGEMENT BACKEND TESTS PASSED!")

if __name__ == '__main__':
    test_features()

