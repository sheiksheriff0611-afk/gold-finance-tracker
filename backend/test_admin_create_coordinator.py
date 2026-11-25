import os
import django
import sys

# Setup django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gold_tracker.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()

def run_test():
    print("==================================================")
    print("TEST: ADMIN ABLE TO CREATE NEW COORDINATORS")
    print("==================================================")

    client = APIClient()

    # 1. Setup Admin user
    admin = User.objects.filter(role='ADMIN').first()
    if not admin:
        admin = User.objects.create_superuser('admin_coord_tester', 'admin@gf.com', 'AdminPass123!', role='ADMIN')

    # Clean up test accounts if existing
    test_crd_username = 'arun_coordinator_test'
    test_exec_username = 'subordinate_exec_test'
    User.objects.filter(username__in=[test_crd_username, test_exec_username]).delete()

    # 2. Phase 1: Security gate check - non-admin cannot create coordinator
    print("\n--- PHASE 1: Verify non-admin cannot create coordinator ---")
    existing_crd = User.objects.filter(role='COORDINATOR').first()
    if existing_crd:
        client.force_authenticate(user=existing_crd)
        crd_attempt = client.post('/api/accounts/employees/', {
            'username': 'illegal_coord_by_crd',
            'first_name': 'Illegal',
            'last_name': 'Coord',
            'role': 'COORDINATOR'
        }, format='json')
        assert crd_attempt.status_code in [403, 401], f"Expected 403 Forbidden, got {crd_attempt.status_code}"
        print("✓ Project Coordinator blocked from creating coordinator accounts (403 Forbidden)")

    existing_exec = User.objects.filter(role='SALES_EXECUTIVE').first()
    if existing_exec:
        client.force_authenticate(user=existing_exec)
        exec_attempt = client.post('/api/accounts/employees/', {
            'username': 'illegal_coord_by_exec',
            'first_name': 'Illegal',
            'last_name': 'Coord',
            'role': 'COORDINATOR'
        }, format='json')
        assert exec_attempt.status_code in [403, 401], f"Expected 403 Forbidden, got {exec_attempt.status_code}"
        print("✓ Sales Executive blocked from creating coordinator accounts (403 Forbidden)")

    # 3. Phase 2: Admin creates new Project Coordinator
    print("\n--- PHASE 2: Admin creates new Project Coordinator ---")
    client.force_authenticate(user=admin)
    create_payload = {
        'username': test_crd_username,
        'first_name': 'Arun',
        'last_name': 'Prasad',
        'email': 'arun.prasad@goldfinance.com',
        'phone': '9840998877',
        'emergency_contact': '9444055667',
        'pan_or_aadhaar': 'AARUP9876Q',
        'address': 'No. 12, Regional Hub, Anna Nagar, Chennai',
        'joining_date': '2026-03-15',
        'role': 'COORDINATOR',
        'status': 'ACTIVE',
        'password': 'CoordPassword@2026'
    }

    res = client.post('/api/accounts/employees/', create_payload, format='json')
    print(f"Admin create coordinator response status: {res.status_code}")
    assert res.status_code == status.HTTP_201_CREATED, f"Failed to create coordinator: {res.data}"

    coord_data = res.data
    crd_id = coord_data.get('id')
    crd_code = coord_data.get('employee_id')
    print(f"✓ Coordinator created! Database ID: {crd_id}, Employee Code: {crd_code}")
    
    assert crd_code and crd_code.startswith('CRD-'), f"Expected CRD-XXXX employee ID prefix, got {crd_code}"
    assert coord_data.get('role') == 'COORDINATOR', "Role must be COORDINATOR"
    assert coord_data.get('assigned_coordinator') is None, "Coordinator should not have an assigned_coordinator"
    print(f"✓ Generated ID: {crd_code} correctly has CRD- prefix")

    # 4. Phase 3: Verify coordinator appears in coordinator list and workload
    print("\n--- PHASE 3: Check Coordinator in System Lists & Workload ---")
    crd_list_res = client.get('/api/accounts/coordinators/')
    assert crd_list_res.status_code == 200
    crd_list = crd_list_res.data
    assert any(c['id'] == crd_id for c in crd_list), f"New coordinator {crd_code} not found in /api/accounts/coordinators/"
    print(f"✓ Coordinator {crd_code} successfully listed in /api/accounts/coordinators/")

    workload_res = client.get('/api/accounts/coordinator-workload/')
    assert workload_res.status_code == 200
    workload_coordinators = workload_res.data.get('coordinators', [])
    crd_card = next((c for c in workload_coordinators if c['coordinator_id'] == crd_id), None)
    assert crd_card is not None, f"Coordinator {crd_code} not found in workload breakdown"
    print(f"✓ Coordinator {crd_code} card active in workload view with {crd_card['total_assigned']} assigned staff")

    # 5. Phase 4: Admin assigns a new executive to this newly created coordinator
    print("\n--- PHASE 4: Admin assigns new Sales Executive to the new Coordinator ---")
    exec_payload = {
        'username': test_exec_username,
        'first_name': 'Deepak',
        'last_name': 'Raj',
        'email': 'deepak.raj@goldfinance.com',
        'phone': '9876500112',
        'address': 'No. 88, Field Sector 4, Chennai',
        'joining_date': '2026-03-16',
        'role': 'SALES_EXECUTIVE',
        'assigned_coordinator': crd_id,
        'status': 'ACTIVE',
        'password': 'ExecPass@123'
    }
    exec_res = client.post('/api/accounts/employees/', exec_payload, format='json')
    assert exec_res.status_code == status.HTTP_201_CREATED, f"Failed to assign executive: {exec_res.data}"
    exec_id = exec_res.data['id']
    exec_code = exec_res.data['employee_id']
    print(f"✓ Sales Executive {exec_code} created and assigned to {crd_code}")

    # 6. Phase 5: New Coordinator logs in and verifies team roster
    print("\n--- PHASE 5: New Coordinator logs in and checks fleet ---")
    new_crd_user = User.objects.get(id=crd_id)
    client.force_authenticate(user=new_crd_user)

    my_team_res = client.get('/api/accounts/coordinator-workload/')
    assert my_team_res.status_code == 200
    my_crd_list = my_team_res.data.get('coordinators', [])
    assert len(my_crd_list) == 1, f"Coordinator should only see their own team, got {len(my_crd_list)}"
    assert my_crd_list[0]['coordinator_id'] == crd_id
    assigned_execs = my_crd_list[0]['executives']
    assert any(e['id'] == exec_id for e in assigned_execs), f"Executive {exec_code} not found in new coordinator's roster"
    print(f"✓ New Coordinator {crd_code} successfully accesses dashboard and sees assigned executive {exec_code} in their fleet!")

    print("\n==================================================")
    print("ALL 5 PHASES PASSED WITH ZERO ERRORS!")
    print("==================================================")

if __name__ == '__main__':
    run_test()
