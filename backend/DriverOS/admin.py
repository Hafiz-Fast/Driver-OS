from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import CarProfile, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    pass


@admin.register(CarProfile)
class CarProfileAdmin(admin.ModelAdmin):
    list_display = ('make', 'model', 'year', 'fuel_type', 'owner', 'updated_at')
    list_filter = ('fuel_type', 'year')
    search_fields = ('make', 'model', 'owner__username', 'owner__email')
    autocomplete_fields = ('owner',)
