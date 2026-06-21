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
