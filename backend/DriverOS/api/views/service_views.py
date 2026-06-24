from decimal import Decimal

from django.db.models import Sum
from rest_framework import generics, permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from DriverOS.api.serializers.service_serializers import (
    FuelFillLogSerializer,
    MaintenanceRecordSerializer,
    TripLogSerializer,
)
from DriverOS.models import CarProfile, FuelFillLog, MaintenanceRecord, TripLog


class UserOwnedCarMixin:
    permission_classes = [permissions.IsAuthenticated]

    def filter_by_car(self, queryset):
        car_id = self.request.query_params.get('car_id')
        if car_id:
            queryset = queryset.filter(car_id=car_id)
        return queryset

    def ensure_user_owns_car(self, car):
        if car.owner_id != self.request.user.id:
            raise PermissionDenied('You do not have access to this vehicle.')

    def perform_create(self, serializer):
        self.ensure_user_owns_car(serializer.validated_data['car'])
        serializer.save()

    def perform_update(self, serializer):
        self.ensure_user_owns_car(serializer.validated_data.get('car', serializer.instance.car))
        serializer.save()


class TripLogListCreateView(UserOwnedCarMixin, generics.ListCreateAPIView):
    serializer_class = TripLogSerializer

    def get_queryset(self):
        return self.filter_by_car(TripLog.objects.filter(car__owner=self.request.user).select_related('car'))


class TripLogDetailView(UserOwnedCarMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TripLogSerializer

    def get_queryset(self):
        return TripLog.objects.filter(car__owner=self.request.user).select_related('car')


class FuelFillLogListCreateView(UserOwnedCarMixin, generics.ListCreateAPIView):
    serializer_class = FuelFillLogSerializer

    def get_queryset(self):
        return self.filter_by_car(FuelFillLog.objects.filter(car__owner=self.request.user).select_related('car'))


class FuelFillLogDetailView(UserOwnedCarMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = FuelFillLogSerializer

    def get_queryset(self):
        return FuelFillLog.objects.filter(car__owner=self.request.user).select_related('car')


class MaintenanceRecordListCreateView(UserOwnedCarMixin, generics.ListCreateAPIView):
    serializer_class = MaintenanceRecordSerializer

    def get_queryset(self):
        return self.filter_by_car(
            MaintenanceRecord.objects.filter(car__owner=self.request.user).select_related('car')
        )


class MaintenanceRecordDetailView(UserOwnedCarMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MaintenanceRecordSerializer

    def get_queryset(self):
        return MaintenanceRecord.objects.filter(car__owner=self.request.user).select_related('car')


class DriverServiceSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cars = CarProfile.objects.filter(owner=request.user)
        car_id = request.query_params.get('car_id')
        if car_id:
            cars = cars.filter(id=car_id)

        car_ids = list(cars.values_list('id', flat=True))
        trips = TripLog.objects.filter(car_id__in=car_ids)
        fills = FuelFillLog.objects.filter(car_id__in=car_ids).order_by('filled_at', 'odometer_reading')
        maintenance = MaintenanceRecord.objects.filter(car_id__in=car_ids).select_related('car')

        total_distance = trips.aggregate(total=Sum('distance_km'))['total'] or Decimal('0')
        total_minutes = trips.aggregate(total=Sum('duration_minutes'))['total'] or 0
        total_fuel_cost = fills.aggregate(total=Sum('cost'))['total'] or Decimal('0')
        total_litres = fills.aggregate(total=Sum('litres'))['total'] or Decimal('0')

        fill_list = list(fills)
        consumption_points = []
        previous_fill = None
        for fill in fill_list:
            if previous_fill and fill.odometer_reading > previous_fill.odometer_reading and fill.litres:
                km = fill.odometer_reading - previous_fill.odometer_reading
                km_per_litre = Decimal(km) / fill.litres
                cost_per_km = fill.cost / Decimal(km) if km else Decimal('0')
                consumption_points.append({
                    'date': fill.filled_at,
                    'km': km,
                    'litres': fill.litres,
                    'km_per_litre': round(float(km_per_litre), 2),
                    'cost_per_km': round(float(cost_per_km), 2),
                })
            previous_fill = fill

        average_km_per_litre = None
        average_cost_per_km = None
        if consumption_points:
            average_km_per_litre = round(
                sum(point['km_per_litre'] for point in consumption_points) / len(consumption_points),
                2
            )
            average_cost_per_km = round(
                sum(point['cost_per_km'] for point in consumption_points) / len(consumption_points),
                2
            )

        due_items = []
        for item in maintenance:
            reminder_state = MaintenanceRecordSerializer().get_reminder_state(item)
            if item.status == MaintenanceRecord.STATUS_UPCOMING or reminder_state in ('due', 'soon'):
                due_items.append({
                    'id': item.id,
                    'car': str(item.car),
                    'title': item.title,
                    'next_due_date': item.next_due_date,
                    'next_due_odometer': item.next_due_odometer,
                    'reminder_state': reminder_state,
                })

        return Response({
            'total_trip_distance_km': round(float(total_distance), 2),
            'total_trip_duration_minutes': total_minutes,
            'total_fuel_cost': round(float(total_fuel_cost), 2),
            'total_litres': round(float(total_litres), 2),
            'average_km_per_litre': average_km_per_litre,
            'average_cost_per_km': average_cost_per_km,
            'consumption_points': consumption_points[-6:],
            'due_maintenance': due_items[:6],
        })
