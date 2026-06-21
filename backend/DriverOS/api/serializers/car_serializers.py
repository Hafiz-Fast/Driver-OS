from django.utils import timezone
from rest_framework import serializers

from DriverOS.models import CarProfile


class CarProfileSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = CarProfile
        fields = (
            'id',
            'owner',
            'make',
            'model',
            'year',
            'mileage',
            'fuel_type',
            'display_name',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'owner', 'display_name', 'created_at', 'updated_at')

    def validate_year(self, value):
        current_year = timezone.now().year
        if value < 1886 or value > current_year + 1:
            raise serializers.ValidationError('Enter a valid vehicle year.')
        return value

    def get_display_name(self, obj):
        return f'{obj.make} {obj.model} ({obj.year})'
