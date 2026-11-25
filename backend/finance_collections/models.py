import uuid
from django.db import models
from django.conf import settings


class CustomerVisit(models.Model):
    PURPOSE_CHOICES = (
        ('NEW_LOAN_INQUIRY', 'New Loan Inquiry'),
        ('GOLD_COLLECTION', 'Gold Jewellery Collection'),
        ('CASH_COLLECTION', 'Cash Collection / EMI'),
        ('FOLLOW_UP', 'Customer Follow-up'),
        ('DEFAULT_RECOVERY', 'Overdue / Recovery'),
        ('DOCUMENT_VERIFICATION', 'Document & KYC Verification'),
    )

    STATUS_CHOICES = (
        ('COMPLETED', 'Completed'),
        ('RESCHEDULED', 'Rescheduled'),
        ('CANCELLED', 'Cancelled'),
        ('CUSTOMER_UNAVAILABLE', 'Customer Unavailable'),
    )

    employee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='customer_visits')
    customer_name = models.CharField(max_length=150)
    customer_mobile = models.CharField(max_length=20)
    customer_address = models.TextField()
    
    visit_datetime = models.DateTimeField()
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    
    visit_purpose = models.CharField(max_length=30, choices=PURPOSE_CHOICES, default='GOLD_COLLECTION')
    visit_status = models.CharField(max_length=25, choices=STATUS_CHOICES, default='COMPLETED')
    remarks = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-visit_datetime']

    def __str__(self):
        return f"{self.customer_name} - {self.get_visit_purpose_display()} ({self.visit_datetime.strftime('%Y-%m-%d')})"


class GoldCollection(models.Model):
    JEWELLERY_CHOICES = (
        ('BANGLES', 'Gold Bangles'),
        ('NECKLACE', 'Gold Necklace'),
        ('CHAIN', 'Gold Chain'),
        ('RING', 'Gold Rings'),
        ('EARRINGS', 'Gold Earrings'),
        ('COINS', 'Gold Coins / Bars'),
        ('MIXED_ITEMS', 'Assorted Jewellery Items'),
        ('OTHER', 'Other Gold Ornaments'),
    )

    PURITY_CHOICES = (
        ('18K', '18 Karat (75.0%)'),
        ('20K', '20 Karat (83.3%)'),
        ('22K', '22 Karat (91.6%) 916 BIS Hallmarked'),
        ('24K', '24 Karat (99.9%) Fine Gold'),
    )

    APPROVAL_CHOICES = (
        ('PENDING', 'Pending Verification'),
        ('VERIFIED', 'Verified by Coordinator'),
        ('APPROVED', 'Approved by Admin'),
        ('REJECTED', 'Rejected'),
    )

    employee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='gold_collections')
    customer_name = models.CharField(max_length=150)
    customer_mobile = models.CharField(max_length=20)
    customer_address = models.TextField()
    
    jewellery_type = models.CharField(max_length=25, choices=JEWELLERY_CHOICES)
    jewellery_description = models.TextField(blank=True, help_text="Detailed item count, hallmarks, identification marks")
    gold_weight_grams = models.DecimalField(max_digits=10, decimal_places=3, help_text="Net weight in grams")
    gold_purity = models.CharField(max_length=10, choices=PURITY_CHOICES, default='22K')
    estimated_value = models.DecimalField(max_digits=12, decimal_places=2, default=0.0, help_text="Estimated value in INR (₹)")
    
    collection_datetime = models.DateTimeField()
    receipt_number = models.CharField(max_length=50, unique=True, db_index=True)
    
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    
    jewellery_photo = models.ImageField(upload_to='jewellery_photos/%Y/%m/', null=True, blank=True)
    receipt_photo = models.ImageField(upload_to='receipt_photos/%Y/%m/', null=True, blank=True)
    remarks = models.TextField(blank=True)
    
    # Verification & Approval workflow
    approval_status = models.CharField(max_length=20, choices=APPROVAL_CHOICES, default='PENDING', db_index=True)
    
    verified_by_coordinator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='gold_verified_set'
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    
    approved_by_admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='gold_approved_set'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    
    rejection_remarks = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-collection_datetime']

    def __str__(self):
        return f"Gold {self.receipt_number} - {self.customer_name} ({self.gold_weight_grams}g {self.gold_purity})"


class CashCollection(models.Model):
    PAYMENT_CHOICES = (
        ('CASH_HANDOVER', 'Physical Cash Handover'),
        ('IMPS_UPI_QR', 'Instant UPI / QR Transfer'),
        ('BANK_TRANSFER', 'NEFT / RTGS Bank Transfer'),
        ('CHEQUE', 'Cheque / DD Payment'),
    )

    APPROVAL_CHOICES = (
        ('PENDING', 'Pending Verification'),
        ('VERIFIED', 'Verified by Coordinator'),
        ('APPROVED', 'Approved by Admin'),
        ('REJECTED', 'Rejected'),
    )

    DEPOSIT_STATUS_CHOICES = (
        ('IN_HAND', 'In Hand / Pending Deposit'),
        ('DEPOSITED_BRANCH', 'Deposited at Branch Counter'),
        ('BANK_DEPOSITED', 'Deposited into Company Bank Account'),
        ('RECONCILED', 'Reconciled & Balanced'),
    )

    employee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cash_collections')
    customer_name = models.CharField(max_length=150)
    customer_mobile = models.CharField(max_length=20)
    customer_address = models.TextField(blank=True)
    
    cash_amount = models.DecimalField(max_digits=12, decimal_places=2, help_text="Amount collected in INR (₹)")
    receipt_number = models.CharField(max_length=50, unique=True, db_index=True)
    collection_datetime = models.DateTimeField()
    
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    
    payment_method = models.CharField(max_length=20, choices=PAYMENT_CHOICES, default='CASH_HANDOVER')
    receipt_photo = models.ImageField(upload_to='cash_receipts/%Y/%m/', null=True, blank=True)
    remarks = models.TextField(blank=True)
    
    # Approval workflow
    approval_status = models.CharField(max_length=20, choices=APPROVAL_CHOICES, default='PENDING', db_index=True)
    
    verified_by_coordinator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cash_verified_set'
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    
    approved_by_admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cash_approved_set'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_remarks = models.TextField(blank=True)
    
    # Cash reconciliation
    deposit_status = models.CharField(max_length=25, choices=DEPOSIT_STATUS_CHOICES, default='IN_HAND')
    deposit_date = models.DateTimeField(null=True, blank=True)
    bank_reference = models.CharField(max_length=100, blank=True, help_text="Bank Challan No / UTR Number")
    reconciliation_remarks = models.TextField(blank=True)
    reconciled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cash_reconciled_set'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-collection_datetime']

    def __str__(self):
        return f"Cash {self.receipt_number} - {self.customer_name} (₹{self.cash_amount:,.2f})"


class CollectionApprovalLog(models.Model):
    COLLECTION_TYPES = (
        ('GOLD', 'Gold Collection'),
        ('CASH', 'Cash Collection'),
    )

    collection_type = models.CharField(max_length=10, choices=COLLECTION_TYPES)
    gold_collection = models.ForeignKey(GoldCollection, on_delete=models.CASCADE, null=True, blank=True, related_name='logs')
    cash_collection = models.ForeignKey(CashCollection, on_delete=models.CASCADE, null=True, blank=True, related_name='logs')
    
    action = models.CharField(max_length=50) # e.g. SUBMITTED, VERIFIED, APPROVED, REJECTED, RECONCILED
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    previous_status = models.CharField(max_length=30)
    new_status = models.CharField(max_length=30)
    remarks = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.collection_type} [{self.action}] by {self.actor} at {self.timestamp.strftime('%Y-%m-%d %H:%M')}"
