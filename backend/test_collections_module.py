import os
import django
from io import BytesIO
from PIL import Image
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gold_tracker.settings')
django.setup()

from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from accounts.models import User
from finance_collections.models import GoldCollection, CashCollection, CollectionApprovalLog

def create_dummy_image(name='test.png'):
    file = BytesIO()
    image = Image.new('RGB', (100, 100), color='gold')
    image.save(file, 'png')
    file.seek(0)
    return SimpleUploadedFile(name, file.read(), content_type='image/png')

def test_collections():
    client = APIClient()

    # 1. Login as Sales Executive
    exec1 = User.objects.get(username='executive1')
    client.force_authenticate(user=exec1)
    print(f"Authenticated as Field Executive: {exec1.get_full_name()} ({exec1.employee_id})")

    # Generate distinct receipt numbers
    gold_receipt = f"GLD-TEST-{os.urandom(3).hex().upper()}"
    cash_receipt = f"CSH-TEST-{os.urandom(3).hex().upper()}"

    # 2. Submit Gold Collection with Multipart Photos
    jewellery_photo = create_dummy_image('bangles.png')
    receipt_photo = create_dummy_image('gold_receipt.png')

    gold_payload = {
        'customer_name': 'Lakshmi Narayanan',
        'customer_mobile': '9840398403',
        'customer_address': 'Plot 45, Gandhi Road, T. Nagar, Chennai',
        'jewellery_type': 'BANGLES',
        'jewellery_description': '4 pcs 916 KDM hallmarked bangles',
        'gold_weight_grams': '32.450',
        'gold_purity': '22K',
        'estimated_value': '233640.00',
        'collection_datetime': '2026-11-19T11:00:00Z',
        'receipt_number': gold_receipt,
        'latitude': 13.0418,
        'longitude': 80.2341,
        'remarks': 'Weighed on certified digital scale. Stone deduction zero.',
        'jewellery_photo': jewellery_photo,
        'receipt_photo': receipt_photo
    }

    r = client.post('/api/collections/gold/', gold_payload, format='multipart')
    assert r.status_code == 201, f"Gold collection submission failed: {r.data}"
    gold_id = r.data['id']
    print(f"✓ 1. Gold Collection created successfully (ID: {gold_id}, Receipt: {gold_receipt})")
    assert r.data['gold_weight_grams'] == '32.450'
    assert r.data['jewellery_photo'] is not None
    assert r.data['receipt_photo'] is not None
    print(f"   - Photos saved: {r.data['jewellery_photo']}")

    # 3. Prevent Duplicate Gold Receipt
    r_dup = client.post('/api/collections/gold/', gold_payload, format='multipart')
    assert r_dup.status_code == 400, "Duplicate receipt should be rejected with 400"
    assert 'receipt_number' in r_dup.data, f"Expected receipt_number validation error, got: {r_dup.data}"
    print(f"✓ 2. Duplicate Gold Receipt rejection verified: {r_dup.data['receipt_number']}")

    # 4. Submit Cash Collection with Receipt Photo
    cash_receipt_photo = create_dummy_image('cash_receipt.png')
    cash_payload = {
        'customer_name': 'Karthik Subramanian',
        'customer_mobile': '9840498404',
        'customer_address': 'Door 12, 1st Cross, Anna Nagar West',
        'cash_amount': '75000.00',
        'receipt_number': cash_receipt,
        'collection_datetime': '2026-11-19T11:30:00Z',
        'latitude': 13.0850,
        'longitude': 80.2100,
        'payment_method': 'CASH_HANDOVER',
        'remarks': '150 x ₹500 currency notes, UV passed.',
        'receipt_photo': cash_receipt_photo
    }

    r = client.post('/api/collections/cash/', cash_payload, format='multipart')
    assert r.status_code == 201, f"Cash collection submission failed: {r.data}"
    cash_id = r.data['id']
    print(f"✓ 3. Cash Collection created successfully (ID: {cash_id}, Receipt: {cash_receipt})")
    assert Decimal(str(r.data['cash_amount'])) == Decimal('75000.00')
    assert r.data['deposit_status'] == 'IN_HAND'
    assert r.data['receipt_photo'] is not None

    # 5. Prevent Duplicate Cash Receipt
    r_dup_cash = client.post('/api/collections/cash/', cash_payload, format='multipart')
    assert r_dup_cash.status_code == 400
    assert 'receipt_number' in r_dup_cash.data
    print(f"✓ 4. Duplicate Cash Receipt rejection verified: {r_dup_cash.data['receipt_number']}")

    # 6. Reconcile Cash Deposit (In-Hand -> Bank Deposited)
    coord = User.objects.get(username='coordinator1')
    client.force_authenticate(user=coord)
    r_rec = client.post('/api/collections/reconcile-cash/', {
        'id': cash_id,
        'deposit_status': 'BANK_DEPOSITED',
        'bank_reference': 'HDFC-UTR-991823019',
        'reconciliation_remarks': 'Deposited at HDFC T. Nagar Branch counter, counterfoil attached.'
    }, format='json')
    assert r_rec.status_code == 200, f"Reconciliation failed: {r_rec.data}"
    print(f"✓ 5. Cash Deposit Reconciliation verified: {r_rec.data['message']}")

    # 7. Check Audit Logs Created for Collection
    logs = CollectionApprovalLog.objects.filter(cash_collection_id=cash_id)
    assert logs.count() >= 2  # SUBMITTED + RECONCILED
    print(f"✓ 6. Audit Trail verified: {logs.count()} logs recorded for Cash Collection {cash_receipt}")

    # 8. Admin Verification & Approval Flow
    admin = User.objects.get(username='admin')
    client.force_authenticate(user=admin)

    # Approve Gold
    r_app = client.post('/api/collections/approve/', {
        'type': 'GOLD',
        'id': gold_id,
        'remarks': 'Purity tested and certified 22K 916 hallmarked. Vault locker allocated.'
    }, format='json')
    assert r_app.status_code == 200, f"Gold approval failed: {r_app.data}"
    print(f"✓ 7. Gold Collection approved by Admin: Status {r_app.data['approval_status']}")

    # 9. Verify Immutability of Approved Records (Security Lock)
    r_lock = client.patch(f'/api/collections/gold/{gold_id}/', {'customer_name': 'Tampered Name'}, format='json')
    assert r_lock.status_code == 400, "Approved records must be immutable!"
    print(f"✓ 8. Immutability verified: Approved records locked against modification.")

    print("\n=======================================================")
    print("ALL GOLD & CASH COLLECTION INTEGRATION TESTS PASSED 100%!")
    print("=======================================================")

if __name__ == '__main__':
    test_collections()
