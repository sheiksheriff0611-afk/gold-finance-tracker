import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gold_tracker.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()

def run_test():
    print("==================================================")
    print("TEST: CITIES & BRANCHES SCROLL DOWN BUTTONS & COORDINATOR ONBOARDING")
    print("==================================================")

    client = APIClient()

    # 1. Admin login
    admin = User.objects.filter(role='ADMIN').first()
    if not admin:
        admin = User.objects.create_superuser('admin_city_test', 'admin@gf.com', 'AdminPass123!', role='ADMIN')

    client.force_authenticate(user=admin)

    # 2. Check /api/accounts/cities-branches/ endpoint
    print("\n--- PHASE 1: Verify /api/accounts/cities-branches/ endpoint ---")
    cb_res = client.get('/api/accounts/cities-branches/')
    assert cb_res.status_code == 200, f"Expected 200 OK, got {cb_res.status_code}"
    cities_data = cb_res.data
    assert len(cities_data) >= 10, f"Expected at least 10 operational cities, got {len(cities_data)}"
    
    city_names = [c['city'] for c in cities_data]
    print(f"Available Cities ({len(cities_data)}): {', '.join(city_names[:6])}...")
    assert 'Chennai' in city_names
    assert 'Coimbatore' in city_names
    assert 'Madurai' in city_names

    chennai_obj = next(c for c in cities_data if c['city'] == 'Chennai')
    assert len(chennai_obj['branches']) >= 5
    print(f"Chennai Branches ({len(chennai_obj['branches'])}): {', '.join(chennai_obj['branches'][:4])}...")
    print(">>> PASS: Cities and Branches API functioning correctly")

    # 3. Create Coordinator with City and Branch
    print("\n--- PHASE 2: Create Coordinator with Selected City and Branch ---")
    test_username = 'crd_coimbatore_mgr'
    User.objects.filter(username=test_username).delete()

    crd_payload = {
        'username': test_username,
        'first_name': 'Manoj',
        'last_name': 'Velusamy',
        'email': 'manoj.v@goldfinance.com',
        'phone': '9842100223',
        'emergency_contact': '9443011223',
        'pan_or_aadhaar': 'CBENJ8822K',
        'address': 'No. 88, 100 Feet Road, Gandhipuram, Coimbatore',
        'city': 'Coimbatore',
        'branch': 'Gandhipuram Main Branch',
        'joining_date': '2026-03-20',
        'role': 'COORDINATOR',
        'status': 'ACTIVE',
        'password': 'CoordPass@123'
    }

    create_res = client.post('/api/accounts/employees/', crd_payload, format='json')
    assert create_res.status_code == status.HTTP_201_CREATED, f"Failed to create coordinator: {create_res.data}"
    
    created_data = create_res.data
    crd_code = created_data.get('employee_id')
    crd_id = created_data.get('id')
    print(f"✓ Coordinator created: {crd_code} (ID: {crd_id})")
    assert crd_code and crd_code.startswith('CRD-')
    assert created_data.get('city') == 'Coimbatore'
    assert created_data.get('branch') == 'Gandhipuram Main Branch'
    print(f"✓ Stored City: {created_data.get('city')}, Stored Branch: {created_data.get('branch')}")

    # 4. Check Workload View for City and Branch
    print("\n--- PHASE 3: Check Coordinator in Workload with City & Branch ---")
    workload_res = client.get('/api/accounts/coordinator-workload/')
    assert workload_res.status_code == 200
    crd_cards = workload_res.data.get('coordinators', [])
    my_card = next((c for c in crd_cards if c['coordinator_id'] == crd_id), None)
    assert my_card is not None, f"Coordinator {crd_code} not found in workload list"
    assert my_card.get('city') == 'Coimbatore', f"Expected Coimbatore, got {my_card.get('city')}"
    assert my_card.get('branch') == 'Gandhipuram Main Branch', f"Expected Gandhipuram Main Branch, got {my_card.get('branch')}"
    print(f"✓ Workload Card verified: {my_card.get('name')} -> {my_card.get('city')} ({my_card.get('branch')})")

    # 5. Check Directory View for City and Branch
    print("\n--- PHASE 4: Check Directory View for City & Branch ---")
    dir_res = client.get(f'/api/accounts/employees/?search={test_username}')
    assert dir_res.status_code == 200
    results = dir_res.data.get('results', dir_res.data)
    assert len(results) >= 1
    dir_emp = results[0]
    assert dir_emp.get('city') == 'Coimbatore'
    assert dir_emp.get('branch') == 'Gandhipuram Main Branch'
    print(f"✓ Directory API verified: {dir_emp.get('employee_id')} with {dir_emp.get('city')} • {dir_emp.get('branch')}")

    print("\n==================================================")
    print("ALL 4 PHASES PASSED WITH ZERO ERRORS!")
    print("==================================================")

if __name__ == '__main__':
    run_test()
