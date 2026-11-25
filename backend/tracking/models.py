from django.db import models
from django.conf import settings


class WorkShift(models.Model):
    employee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='work_shifts')
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    
    start_latitude = models.FloatField(null=True, blank=True)
    start_longitude = models.FloatField(null=True, blank=True)
    end_latitude = models.FloatField(null=True, blank=True)
    end_longitude = models.FloatField(null=True, blank=True)
    
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-start_time']

    def __str__(self):
        status = "Active" if self.is_active else "Ended"
        return f"{self.employee.employee_id} - Shift {self.start_time.strftime('%Y-%m-%d %H:%M')} ({status})"


class LocationPing(models.Model):
    ACTIVITY_CHOICES = (
        ('START_WORK', 'Started Work'),
        ('END_WORK', 'Ended Work'),
        ('PERIODIC_PING', 'Periodic GPS Ping'),
        ('CUSTOMER_VISIT', 'Customer Visit'),
        ('GOLD_COLLECTION', 'Gold Jewellery Collection'),
        ('CASH_COLLECTION', 'Cash Collection'),
    )

    employee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='location_pings')
    shift = models.ForeignKey(WorkShift, on_delete=models.SET_NULL, null=True, blank=True, related_name='pings')
    
    latitude = models.FloatField()
    longitude = models.FloatField()
    accuracy = models.FloatField(default=10.0, help_text="Accuracy in meters")
    activity_type = models.CharField(max_length=30, choices=ACTIVITY_CHOICES, default='PERIODIC_PING')
    battery_level = models.IntegerField(null=True, blank=True, help_text="Battery %")
    address_snapshot = models.CharField(max_length=255, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['employee', '-timestamp']),
        ]

    def __str__(self):
        return f"{self.employee.employee_id} @ ({self.latitude:.4f}, {self.longitude:.4f}) - {self.activity_type}"
