from decimal import Decimal

from rest_framework import serializers

from DriverOS.models import FuelFillLog, MaintenanceRecord, TripLog


class TripLogSerializer(serializers.ModelSerializer):
    car_display = serializers.SerializerMethodField()

    class Meta:
        model = TripLog
        fields = (
            'id',
            'car',
            'car_display',
            'started_at',
            'ended_at',
            'start_location',
            'end_location',
            'distance_km',
            'duration_minutes',
            'notes',
            'created_at',
        )
        read_only_fields = ('id', 'car_display', 'created_at')

    def validate(self, attrs):
        started_at = attrs.get('started_at', getattr(self.instance, 'started_at', None))
        ended_at = attrs.get('ended_at', getattr(self.instance, 'ended_at', None))
        distance_km = attrs.get('distance_km', getattr(self.instance, 'distance_km', None))
        duration_minutes = attrs.get('duration_minutes', getattr(self.instance, 'duration_minutes', None))

        if started_at and ended_at and ended_at < started_at:
            raise serializers.ValidationError('Trip end time must be after start time.')
        if distance_km is not None and Decimal(distance_km) < 0:
            raise serializers.ValidationError('Distance cannot be negative.')
        if duration_minutes is not None and duration_minutes < 1:
            raise serializers.ValidationError('Duration must be at least 1 minute.')
        return attrs

    def get_car_display(self, obj):
        return str(obj.car)


class FuelFillLogSerializer(serializers.ModelSerializer):
    cost_per_litre = serializers.SerializerMethodField()

    class Meta:
        model = FuelFillLog
        fields = (
            'id',
            'car',
            'filled_at',
            'litres',
            'cost',
            'cost_per_litre',
            'odometer_reading',
            'station',
            'notes',
            'created_at',
        )
        read_only_fields = ('id', 'cost_per_litre', 'created_at')

    def validate(self, attrs):
        litres = attrs.get('litres', getattr(self.instance, 'litres', None))
        cost = attrs.get('cost', getattr(self.instance, 'cost', None))
        odometer_reading = attrs.get('odometer_reading', getattr(self.instance, 'odometer_reading', None))

        if litres is not None and Decimal(litres) <= 0:
            raise serializers.ValidationError('Litres must be greater than zero.')
        if cost is not None and Decimal(cost) < 0:
            raise serializers.ValidationError('Cost cannot be negative.')
        if odometer_reading is not None and odometer_reading < 0:
            raise serializers.ValidationError('Odometer reading cannot be negative.')
        return attrs

    def get_cost_per_litre(self, obj):
        if not obj.litres:
            return None
        return round(float(obj.cost / obj.litres), 2)


class MaintenanceRecordSerializer(serializers.ModelSerializer):
    reminder_state = serializers.SerializerMethodField()

    class Meta:
        model = MaintenanceRecord
        fields = (
            'id',
            'car',
            'title',
            'service_date',
            'odometer_reading',
            'cost',
            'next_due_date',
            'next_due_odometer',
            'status',
            'notes',
            'reminder_state',
            'created_at',
        )
        read_only_fields = ('id', 'reminder_state', 'created_at')

    def validate(self, attrs):
        status = attrs.get('status', getattr(self.instance, 'status', MaintenanceRecord.STATUS_DONE))
        service_date = attrs.get('service_date', getattr(self.instance, 'service_date', None))
        odometer_reading = attrs.get('odometer_reading', getattr(self.instance, 'odometer_reading', None))
        next_due_date = attrs.get('next_due_date', getattr(self.instance, 'next_due_date', None))
        next_due_odometer = attrs.get('next_due_odometer', getattr(self.instance, 'next_due_odometer', None))

        if status == MaintenanceRecord.STATUS_DONE and not service_date and odometer_reading is None:
            raise serializers.ValidationError('Completed service needs a service date or odometer reading.')
        if status == MaintenanceRecord.STATUS_UPCOMING and not next_due_date and next_due_odometer is None:
            raise serializers.ValidationError('Upcoming service needs a due date or due odometer.')
        return attrs

    def get_reminder_state(self, obj):
        current_mileage = obj.car.mileage
        if obj.next_due_odometer and obj.next_due_odometer <= current_mileage:
            return 'due'
        if obj.next_due_odometer and obj.next_due_odometer - current_mileage <= 500:
            return 'soon'
        return 'clear'
