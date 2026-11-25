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
    print("TEST: ADMIN ADD EMPLOYEE & COORDINATOR ROSTER REFLECTION")
    print("==================================================")

    client = APIClient()

    # 1. Setup / Retrieve Admin and Coordinator users
    admin = User.objects.filter(role='ADMIN').first()
    if not admin:
        admin = User.objects.create_superuser('admin_roster_test', 'admin@gf.com', 'AdminPass123!', role='ADMIN')

    crd1 = User.objects.filter(role='COORDINATOR').first()
    if not crd1:
        crd1 = User.objects.create_user('crd1_test', 'crd1@gf.com', 'CoordPass123!', role='COORDINATOR', first_name='Suresh', last_name='Kumar')

    crd2 = User.objects.filter(role='COORDINATOR').exclude(id=crd1.id).first()
    if not crd2:
        crd2 = User.objects.create_user('crd2_test', 'crd2@gf.com', 'CoordPass123!', role='COORDINATOR', first_name='Priya', last_name='Menon')

    print(f"[*] Admin: {admin.username} ({admin.employee_id})")
    print(f"[*] Coordinator 1: {crd1.username} ({crd1.employee_id})")
    print(f"[*] Coordinator 2: {crd2.username} ({crd2.employee_id})")

    # 2. Verify Coordinator CANNOT add an employee (Permission check)
    print("\n--- PHASE 1: Verify Coordinator is BLOCKED from adding employee ---")
    client.force_authenticate(user=crd1)
    crd_add_res = client.post('/api/accounts/employees/', {
        'username': 'illegal_emp_by_crd',
        'first_name': 'Illegal',
        'last_name': 'Employee',
        'email': 'illegal@test.com',
        'phone': '9988776655',
        'role': 'SALES_EXECUTIVE'
    }, format='json')
    print(f"Coordinator POST status: {crd_add_res.status_code}")
    assert crd_add_res.status_code in [403, 401], f"Expected 403 Forbidden for coordinator adding employee, got {crd_add_res.status_code}"
    print(">>> PASS: Coordinator cannot add employees (HTTP 403 Forbidden)")

    # 3. Admin creates new employee and assigns to crd1
    print("\n--- PHASE 2: Admin creates new Sales Executive assigned to Coordinator 1 ---")
    client.force_authenticate(user=admin)
    new_username = 'karthik_field_exec_01'
    User.objects.filter(username=new_username).delete()

    admin_add_payload = {
        'username': new_username,
        'first_name': 'Karthik',
        'last_name': 'Venkatesh',
        'email': 'karthik.v@goldfinance.com',
        'phone': '9840123456',
        'emergency_contact': '9444011223',
        'pan_or_aadhaar': 'ABCDE9876K',
        'address': 'No. 45, Golden Avenue, T. Nagar, Chennai',
        'joining_date': '2026-03-01',
        'role': 'SALES_EXECUTIVE',
        'assigned_coordinator': crd1.id,
        'status': 'ACTIVE',
        'password': 'TempPassword@123'
    }

    create_res = client.post('/api/accounts/employees/', admin_add_payload, format='json')
    print(f"Admin create status: {create_res.status_code}")
    assert create_res.status_code == status.HTTP_201_CREATED, f"Admin failed to create employee: {create_res.data}"
    
    emp_data = create_res.data
    emp_id = emp_data.get('id')
    emp_code = emp_data.get('employee_id')
    print(f">>> PASS: Employee created successfully! ID: {emp_id}, Code: {emp_code}")
    assert emp_code and emp_code.startswith('EMP-'), f"Expected EMP-XXXX code, got {emp_code}"

    # 4. Coordinator 1 logs in and checks Employee Directory view
    print("\n--- PHASE 3: Coordinator 1 checks Directory View ---")
    client.force_authenticate(user=crd1)
    crd1_dir_res = client.get('/api/accounts/employees/')
    assert crd1_dir_res.status_code == 200, f"Failed to get directory: {crd1_dir_res.status_code}"
    
    dir_results = crd1_dir_res.data.get('results', crd1_dir_res.data)
    assigned_match = next((e for e in dir_results if e['id'] == emp_id), None)
    assert assigned_match is not None, f"Newly created employee {emp_code} NOT visible in Coordinator 1's directory!"
    
    print(f"Found employee in Coordinator 1's directory:")
    print(f" - Employee Code: {assigned_match.get('employee_id')}")
    print(f" - Full Name: {assigned_match.get('first_name')} {assigned_match.get('last_name')}")
    print(f" - Phone: {assigned_match.get('phone')}")
    print(f" - Email: {assigned_match.get('email')}")
    print(f" - Address: {assigned_match.get('address')}")
    print(f" - Joining Date: {assigned_match.get('joining_date')}")
    print(f" - Assigned Coordinator Code: {assigned_match.get('assigned_coordinator_code')}")
    print(f" - Assigned Coordinator Name: {assigned_match.get('assigned_coordinator_name')}")
    
    assert assigned_match.get('employee_id') == emp_code
    assert assigned_match.get('phone') == '9840123456'
    assert assigned_match.get('address') == 'No. 45, Golden Avenue, T. Nagar, Chennai'
    assert assigned_match.get('assigned_coordinator_code') == crd1.employee_id
    print(">>> PASS: Employee details correctly verified in Coordinator 1 Directory")

    # 5. Coordinator 1 checks Workload / Team Roster view
    print("\n--- PHASE 4: Coordinator 1 checks Team Roster & Workload ---")
    crd1_workload_res = client.get('/api/accounts/coordinator-workload/')
    assert crd1_workload_res.status_code == 200, f"Failed to get workload: {crd1_workload_res.status_code}"
    
    coordinators_list = crd1_workload_res.data.get('coordinators', [])
    assert len(coordinators_list) == 1, f"Coordinator 1 should only see their own workload card, got {len(coordinators_list)}"
    
    my_crd_card = coordinators_list[0]
    assert my_crd_card['coordinator_id'] == crd1.id
    roster_execs = my_crd_card.get('executives', [])
    roster_match = next((e for e in roster_execs if e['id'] == emp_id), None)
    assert roster_match is not None, f"Newly created employee {emp_code} NOT in Coordinator 1's executives roster!"
    
    print(f"Found employee in Coordinator 1's fleet roster:")
    print(f" - ID: {roster_match.get('employee_id')}")
    print(f" - Name: {roster_match.get('name')}")
    print(f" - Mobile: {roster_match.get('phone')}")
    print(f" - Email: {roster_match.get('email')}")
    print(f" - Address: {roster_match.get('address')}")
    print(f" - Joining Date: {roster_match.get('joining_date')}")
    assert roster_match.get('phone') == '9840123456'
    assert roster_match.get('address') == 'No. 45, Golden Avenue, T. Nagar, Chennai'
    print(">>> PASS: Employee details fully visible in Coordinator 1 fleet roster")

    # 6. Verify Isolation: Coordinator 2 CANNOT see Coordinator 1's employee
    print("\n--- PHASE 5: Verify Isolation (Coordinator 2 cannot see Coordinator 1's employee) ---")
    client.force_authenticate(user=crd2)
    crd2_dir_res = client.get('/api/accounts/employees/')
    crd2_results = crd2_dir_res.data.get('results', crd2_dir_res.data)
    crd2_match = next((e for e in crd2_results if e['id'] == emp_id), None)
    assert crd2_match is None, f"Security Breach: Coordinator 2 can see Coordinator 1's assigned employee!"

    crd2_workload_res = client.get('/api/accounts/coordinator-workload/')
    crd2_coordinators = crd2_workload_res.data.get('coordinators', [])
    crd2_execs = crd2_coordinators[0].get('executives', []) if crd2_coordinators else []
    assert not any(e['id'] == emp_id for e in crd2_execs), "Security Breach: Employee appears in Coordinator 2's roster!"
    print(">>> PASS: Strict isolation verified! Coordinator 2 cannot see Coordinator 1's staff")

    print("\n==================================================")
    print("ALL 5 PHASES PASSED WITH ZERO ERRORS!")
    print("==================================================")

if __name__ == '__main__':
    run_test()
