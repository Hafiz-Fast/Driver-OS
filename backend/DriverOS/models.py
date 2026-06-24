from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    # Simple user model — inherits username, email, password, and
    # everything else from Django's built-in AbstractUser.

    email = models.EmailField(unique=True)

    class Meta:
        ordering = ['username']

    def __str__(self):
        return self.username


class CarProfile(models.Model):
    FUEL_PETROL = 'petrol'
    FUEL_DIESEL = 'diesel'
    FUEL_ELECTRIC = 'electric'
    FUEL_HYBRID = 'hybrid'
    FUEL_CNG = 'cng'
    FUEL_LPG = 'lpg'

    FUEL_TYPE_CHOICES = [
        (FUEL_PETROL, 'Petrol'),
        (FUEL_DIESEL, 'Diesel'),
        (FUEL_ELECTRIC, 'Electric'),
        (FUEL_HYBRID, 'Hybrid'),
        (FUEL_CNG, 'CNG'),
        (FUEL_LPG, 'LPG'),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='car_profiles',
    )
    make = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    year = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1886), MaxValueValidator(timezone.now().year + 1)]
    )
    mileage = models.PositiveIntegerField(help_text='Current mileage on the car')
    fuel_type = models.CharField(max_length=20, choices=FUEL_TYPE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at', '-created_at']
        verbose_name = 'car profile'
        verbose_name_plural = 'car profiles'

    def __str__(self):
        return f'{self.make} {self.model} ({self.year})'

class DriveSession(models.Model):
    car = models.ForeignKey(CarProfile, on_delete=models.CASCADE, related_name='sessions')
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

class DrowsinessEvent(models.Model):
    session = models.ForeignKey(DriveSession, on_delete=models.CASCADE, related_name='drowsiness_events')
    timestamp = models.DateTimeField(auto_now_add=True)
    ear_value = models.FloatField()
    alert_triggered = models.BooleanField(default=True)


class TripLog(models.Model):
    car = models.ForeignKey(CarProfile, on_delete=models.CASCADE, related_name='trip_logs')
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField()
    start_location = models.CharField(max_length=255, blank=True)
    end_location = models.CharField(max_length=255, blank=True)
    distance_km = models.DecimalField(max_digits=8, decimal_places=2)
    duration_minutes = models.PositiveIntegerField()
    notes = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-started_at', '-created_at']

    def __str__(self):
        return f'{self.car} - {self.distance_km} km'


class FuelFillLog(models.Model):
    car = models.ForeignKey(CarProfile, on_delete=models.CASCADE, related_name='fuel_fill_logs')
    filled_at = models.DateField()
    litres = models.DecimalField(max_digits=8, decimal_places=2)
    cost = models.DecimalField(max_digits=10, decimal_places=2)
    odometer_reading = models.PositiveIntegerField()
    station = models.CharField(max_length=120, blank=True)
    notes = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-filled_at', '-odometer_reading', '-created_at']

    def __str__(self):
        return f'{self.car} - {self.litres} L'


class MaintenanceRecord(models.Model):
    STATUS_DONE = 'done'
    STATUS_UPCOMING = 'upcoming'

    STATUS_CHOICES = [
        (STATUS_DONE, 'Done'),
        (STATUS_UPCOMING, 'Upcoming'),
    ]

    car = models.ForeignKey(CarProfile, on_delete=models.CASCADE, related_name='maintenance_records')
    title = models.CharField(max_length=120)
    service_date = models.DateField(null=True, blank=True)
    odometer_reading = models.PositiveIntegerField(null=True, blank=True)
    cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    next_due_date = models.DateField(null=True, blank=True)
    next_due_odometer = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DONE)
    notes = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['status', 'next_due_date', 'next_due_odometer', '-service_date', '-created_at']

    def __str__(self):
        return f'{self.car} - {self.title}'
