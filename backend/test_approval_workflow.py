import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gold_tracker.settings')
django.setup()

from rest_framework.test import APIClient
from accounts.models import User
from finance_collections.models import GoldCollection, CashCollection, CollectionApprovalLog

def test_complete_approval_workflow():
    client = APIClient()

    # Get users
    admin = User.objects.get(username='admin')
    coord1 = User.objects.get(username='coordinator1') # Assigned to executive1 & executive2
    coord2 = User.objects.get(username='coordinator2') # Assigned to executive3
    exec1 = User.objects.get(username='executive1')
    exec1.assigned_coordinator = coord1
    exec1.save()

    print(f"Executive 1: {exec1.username} -> Assigned Coord: {exec1.assigned_coordinator.username}")
    assert exec1.assigned_coordinator == coord1

    # Step 1: Sales executive1 submits a Gold Collection
    client.force_authenticate(user=exec1)
    gold_receipt = f"GLD-APPR-{os.urandom(3).hex().upper()}"
    r_gold = client.post('/api/collections/gold/', {
        'customer_name': 'Meenakshi Raman',
        'customer_mobile': '9840598405',
        'customer_address': 'Flat 2A, South Boag Road, Chennai',
        'jewellery_type': 'NECKLACE',
        'jewellery_description': '22K gold heritage necklace',
        'gold_weight_grams': '54.200',
        'gold_purity': '22K',
        'estimated_value': '390240.00',
        'collection_datetime': '2026-11-19T12:00:00Z',
        'receipt_number': gold_receipt,
        'latitude': 13.0418,
        'longitude': 80.2341,
        'remarks': 'Intake complete, awaiting verification.'
    }, format='json')
    assert r_gold.status_code == 201, f"Failed: {r_gold.data}"
    gold_id = r_gold.data['id']
    print(f"✓ 1. Gold collection submitted by {exec1.username} (ID: {gold_id}, Status: PENDING)")

    # Step 2: Coordinator 2 (unassigned) tries to verify executive1's collection -> Expect 403 Forbidden
    client.force_authenticate(user=coord2)
    r_unauth = client.post('/api/collections/approve/', {
        'type': 'GOLD',
        'id': gold_id,
        'remarks': 'Unauthorized verification attempt'
    }, format='json')
    assert r_unauth.status_code == 403, f"Expected 403 Forbidden, got {r_unauth.status_code}: {r_unauth.data}"
    print(f"✓ 2. Security Check: Unassigned Coordinator correctly denied access (403 Forbidden): {r_unauth.data['error']}")

    # Step 3: Assigned Coordinator 1 verifies executive1's collection -> PENDING to VERIFIED
    client.force_authenticate(user=coord1)
    r_coord_app = client.post('/api/collections/approve/', {
        'type': 'GOLD',
        'id': gold_id,
        'remarks': 'Weight verified on calibrated branch balance; hallmarks authenticated.'
    }, format='json')
    assert r_coord_app.status_code == 200, f"Failed: {r_coord_app.data}"
    assert r_coord_app.data['approval_status'] == 'VERIFIED'
    print(f"✓ 3. Assigned Coordinator 1 successfully verified collection (Status: VERIFIED)")

    # Step 4: Test Rejection Workflow with Mandatory Remarks
    # Executive submits a cash collection
    client.force_authenticate(user=exec1)
    cash_receipt = f"CSH-REJ-{os.urandom(3).hex().upper()}"
    r_cash = client.post('/api/collections/cash/', {
        'customer_name': 'Sundaramurthy',
        'customer_mobile': '9840698406',
        'customer_address': 'Shop 4, Bazaar Road, Chennai',
        'cash_amount': '25000.00',
        'receipt_number': cash_receipt,
        'collection_datetime': '2026-11-19T12:15:00Z',
        'payment_method': 'CASH_HANDOVER',
        'remarks': 'Repayment instalment'
    }, format='json')
    assert r_cash.status_code == 201
    cash_id = r_cash.data['id']
    print(f"✓ 4. Cash collection submitted for rejection testing (ID: {cash_id})")

    # Coordinator attempts rejection with blank remarks -> Expect 400 Bad Request
    client.force_authenticate(user=coord1)
    r_blank_rej = client.post('/api/collections/reject/', {
        'type': 'CASH',
        'id': cash_id,
        'remarks': '   '
    }, format='json')
    assert r_blank_rej.status_code == 400
    print(f"✓ 5. Mandatory Remarks enforced: Blank rejection remarks rejected (400 Bad Request)")

    # Coordinator rejects with valid mandatory remarks
    r_rej = client.post('/api/collections/reject/', {
        'type': 'CASH',
        'id': cash_id,
        'remarks': 'Counterfoil serial number mismatch; customer loan account dormant.'
    }, format='json')
    assert r_rej.status_code == 200
    assert r_rej.data['approval_status'] == 'REJECTED'
    print(f"✓ 6. Coordinator successfully rejected collection with logged remarks (Status: REJECTED)")

    # Step 5: Admin Final Approval & Vault Booking
    client.force_authenticate(user=admin)
    r_admin_app = client.post('/api/collections/approve/', {
        'type': 'GOLD',
        'id': gold_id,
        'remarks': 'Headquarters final sign-off. Collateral booked into Master Vault Locker #12.'
    }, format='json')
    assert r_admin_app.status_code == 200
    assert r_admin_app.data['approval_status'] == 'APPROVED'
    print(f"✓ 7. Admin finalized approval into master ledger & vault (Status: APPROVED)")

    # Step 6: Security Verification - Approved Records are Immutable
    client.force_authenticate(user=exec1)
    r_tamper = client.patch(f'/api/collections/gold/{gold_id}/', {'gold_weight_grams': '10.000'}, format='json')
    assert r_tamper.status_code == 400, "Approved records must be immutable!"
    print(f"✓ 8. Security Lock verified: Field staff cannot edit approved collection records.")

    # Step 7: Verify Audit Logs
    r_logs = client.get(f'/api/collections/logs/?type=GOLD&id={gold_id}')
    assert r_logs.status_code == 200
    logs = r_logs.data
    assert len(logs) >= 3  # SUBMITTED -> VERIFIED -> APPROVED
    print(f"✓ 9. Audit Trail complete for Gold Collection {gold_receipt}:")
    for log in logs:
        print(f"     • [{log['timestamp'][:16]}] {log['action']} by {log['actor_name']} ({log['previous_status']} -> {log['new_status']}): {log['remarks']}")

    print("\n=======================================================")
    print("ALL COORDINATOR VERIFICATION & ADMIN APPROVAL TESTS PASSED 100%!")
    print("=======================================================")

if __name__ == '__main__':
    test_complete_approval_workflow()
