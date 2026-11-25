import random
from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    ROLE_CHOICES = (
        ('ADMIN', 'Admin'),
        ('COORDINATOR', 'Project Coordinator'),
        ('SALES_EXECUTIVE', 'Sales Executive'),
    )

    STATUS_CHOICES = (
        ('ACTIVE', 'Active'),
        ('INACTIVE', 'Inactive'),
        ('ON_LEAVE', 'On Leave'),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='SALES_EXECUTIVE')
    employee_id = models.CharField(max_length=30, unique=True, null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    emergency_contact = models.CharField(max_length=20, blank=True)
    pan_or_aadhaar = models.CharField(max_length=30, blank=True, help_text="Government Identity Number")
    address = models.TextField(blank=True)
    joining_date = models.DateField(null=True, blank=True)
    city = models.CharField(max_length=100, blank=True, default='', help_text="Operational City/Region")
    branch = models.CharField(max_length=150, blank=True, default='', help_text="Assigned Branch Office")
    profile_photo = models.ImageField(upload_to='profile_photos/%Y/', null=True, blank=True)
    
    # Hierarchy: Sales Executives are assigned to a Project Coordinator
    assigned_coordinator = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_executives',
        limit_choices_to={'role': 'COORDINATOR'}
    )
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    
    # Real-time work shift & GPS telemetry
    is_working = models.BooleanField(default=False)
    current_latitude = models.FloatField(null=True, blank=True)
    current_longitude = models.FloatField(null=True, blank=True)
    last_location_time = models.DateTimeField(null=True, blank=True)
    gps_enabled = models.BooleanField(default=False)
    device_info = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['employee_id', 'username']

    def save(self, *args, **kwargs):
        # Auto-generate unique employee ID if not provided
        if not self.employee_id:
            prefix = 'ADM' if self.role == 'ADMIN' else ('CRD' if self.role == 'COORDINATOR' else 'EMP')
            random_num = random.randint(1000, 9999)
            candidate = f"{prefix}-{random_num}"
            while User.objects.filter(employee_id=candidate).exists():
                random_num = random.randint(1000, 9999)
                candidate = f"{prefix}-{random_num}"
            self.employee_id = candidate
        super().save(*args, **kwargs)

    @property
    def is_admin_role(self):
        return self.role == 'ADMIN' or self.is_superuser

    @property
    def is_coordinator_role(self):
        return self.role == 'COORDINATOR'

    @property
    def is_sales_executive_role(self):
        return self.role == 'SALES_EXECUTIVE'

    def __str__(self):
        name = self.get_full_name() or self.username
        emp = f" ({self.employee_id})" if self.employee_id else ""
        return f"{name}{emp} - {self.get_role_display()}"


class EmployeeTarget(models.Model):
    PERIOD_CHOICES = (
        ('DAILY', 'Daily'),
        ('WEEKLY', 'Weekly'),
        ('MONTHLY', 'Monthly'),
    )

    employee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='targets')
    period = models.CharField(max_length=10, choices=PERIOD_CHOICES, default='MONTHLY')
    start_date = models.DateField()
    end_date = models.DateField()
    
    gold_target_grams = models.DecimalField(max_digits=10, decimal_places=3, default=0.0)
    cash_target_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='targets_created')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.employee.employee_id} - {self.period} ({self.start_date} to {self.end_date})"
