# backend/core/domains/analytics/utils/metric_calculators.py
import logging
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Any, Optional, Tuple, Union
from django.db.models import Q, QuerySet
from django.utils import timezone
from django.apps import apps
from django.core.cache import cache
import json

logger = logging.getLogger(__name__)


class MetricCalculationError(Exception):
    """Exception raised when metric calculation fails"""
    pass


class AdvancedMetricCalculator:
    """
    Advanced metric calculation utilities with support for complex business logic
    """
    
    @staticmethod
    def calculate_time_series_data(metric_definition, 
                                 start_date: datetime, 
                                 end_date: datetime,
                                 interval: str = 'daily') -> List[Dict[str, Any]]:
        """
        Calculate metric values over time for trend analysis
        
        Args:
            metric_definition: MetricDefinition instance
            start_date: Start date for time series
            end_date: End date for time series
            interval: Time interval ('hourly', 'daily', 'weekly', 'monthly')
            
        Returns:
            List of time series data points
        """
        try:
            time_points = AdvancedMetricCalculator._generate_time_points(
                start_date, end_date, interval
            )
            
            time_series_data = []
            
            for i, time_point in enumerate(time_points):
                # Calculate period bounds
                if i < len(time_points) - 1:
                    period_start = time_point
                    period_end = time_points[i + 1]
                else:
                    # Last period
                    period_start = time_point
                    period_end = end_date
                
                try:
                    # Calculate metric for this time period
                    value = AdvancedMetricCalculator._calculate_metric_for_period(
                        metric_definition, period_start, period_end
                    )
                    
                    time_series_data.append({
                        'date': period_start.isoformat(),
                        'value': float(value) if value is not None else None,
                        'period_start': period_start.isoformat(),
                        'period_end': period_end.isoformat()
                    })
                    
                except Exception as e:
                    logger.warning(f"Error calculating metric for period {period_start}: {str(e)}")
                    time_series_data.append({
                        'date': period_start.isoformat(),
                        'value': None,
                        'error': str(e),
                        'period_start': period_start.isoformat(),
                        'period_end': period_end.isoformat()
                    })
            
            return time_series_data
            
        except Exception as e:
            logger.error(f"Error calculating time series data: {str(e)}")
            raise MetricCalculationError(f"Time series calculation failed: {str(e)}")
    
    @staticmethod
    def calculate_comparative_metrics(metric_definition,
                                    current_start: datetime,
                                    current_end: datetime,
                                    comparison_start: datetime,
                                    comparison_end: datetime) -> Dict[str, Any]:
        """
        Calculate metrics with comparison to previous period
        
        Returns:
            Dict with current, previous, change, and percentage change
        """
        try:
            # Calculate current period
            current_value = AdvancedMetricCalculator._calculate_metric_for_period(
                metric_definition, current_start, current_end
            )
            
            # Calculate comparison period
            comparison_value = AdvancedMetricCalculator._calculate_metric_for_period(
                metric_definition, comparison_start, comparison_end
            )
            
            # Calculate changes
            change = None
            percentage_change = None
            
            if current_value is not None and comparison_value is not None:
                change = current_value - comparison_value
                
                if comparison_value != 0:
                    percentage_change = (change / comparison_value) * 100
                elif current_value != 0:
                    percentage_change = float('inf') if current_value > 0 else float('-inf')
                else:
                    percentage_change = 0
            
            return {
                'current': {
                    'value': current_value,
                    'period_start': current_start.isoformat(),
                    'period_end': current_end.isoformat()
                },
                'comparison': {
                    'value': comparison_value,
                    'period_start': comparison_start.isoformat(),
                    'period_end': comparison_end.isoformat()
                },
                'change': {
                    'absolute': change,
                    'percentage': percentage_change,
                    'direction': 'up' if change and change > 0 else 'down' if change and change < 0 else 'neutral'
                }
            }
            
        except Exception as e:
            logger.error(f"Error calculating comparative metrics: {str(e)}")
            raise MetricCalculationError(f"Comparative calculation failed: {str(e)}")
    
    @staticmethod
    def calculate_cohort_analysis(metric_definition,
                                cohort_field: str,
                                value_field: str,
                                start_date: datetime,
                                end_date: datetime,
                                time_periods: int = 12) -> Dict[str, Any]:
        """
        Calculate cohort analysis for user behavior metrics
        
        Args:
            metric_definition: MetricDefinition instance
            cohort_field: Field to group cohorts by (e.g., 'created_at')
            value_field: Field to measure (e.g., 'revenue', 'count')
            start_date: Analysis start date
            end_date: Analysis end date
            time_periods: Number of time periods to analyze
            
        Returns:
            Cohort analysis data
        """
        try:
            model = AdvancedMetricCalculator._get_source_model(metric_definition)
            
            # Generate monthly cohorts
            cohorts = {}
            current_date = start_date.replace(day=1)  # Start of month
            
            while current_date <= end_date:
                cohort_start = current_date
                cohort_end = (current_date + timedelta(days=32)).replace(day=1) - timedelta(days=1)
                
                # Get cohort users
                cohort_queryset = model.objects.filter(
                    **{f'{cohort_field}__gte': cohort_start,
                       f'{cohort_field}__lte': cohort_end}
                )
                
                # Apply metric filters
                cohort_queryset = AdvancedMetricCalculator._apply_filters(
                    cohort_queryset, metric_definition.filters
                )
                
                if cohort_queryset.exists():
                    cohorts[cohort_start.strftime('%Y-%m')] = {
                        'cohort_start': cohort_start.isoformat(),
                        'cohort_end': cohort_end.isoformat(),
                        'cohort_size': cohort_queryset.count(),
                        'periods': {}
                    }
                
                current_date = cohort_end + timedelta(days=1)
                current_date = current_date.replace(day=1)
            
            # Calculate retention/value for each period
            for cohort_name, cohort_data in cohorts.items():
                cohort_start = datetime.fromisoformat(cohort_data['cohort_start'])
                
                for period in range(time_periods):
                    period_start = cohort_start + timedelta(days=30 * period)
                    period_end = period_start + timedelta(days=30)
                    
                    if period_start > end_date:
                        break
                    
                    # Calculate metric for this cohort in this period
                    period_queryset = model.objects.filter(
                        **{f'{cohort_field}__gte': cohort_start,
                           f'{cohort_field}__lte': datetime.fromisoformat(cohort_data['cohort_end']),
                           f'{value_field}__gte': period_start,
                           f'{value_field}__lte': period_end}
                    )
                    
                    period_queryset = AdvancedMetricCalculator._apply_filters(
                        period_queryset, metric_definition.filters
                    )
                    
                    if metric_definition.metric_type == 'COUNT':
                        period_value = period_queryset.count()
                    elif metric_definition.metric_type == 'SUM':
                        period_value = period_queryset.aggregate(
                            total=models.Sum(metric_definition.source_field)
                        )['total'] or 0
                    else:
                        period_value = period_queryset.count()
                    
                    # Calculate retention rate
                    retention_rate = (period_value / cohort_data['cohort_size']) * 100 if cohort_data['cohort_size'] > 0 else 0
                    
                    cohort_data['periods'][f'period_{period}'] = {
                        'period_start': period_start.isoformat(),
                        'period_end': period_end.isoformat(),
                        'value': period_value,
                        'retention_rate': retention_rate
                    }
            
            return {
                'cohorts': cohorts,
                'analysis_period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat()
                },
                'time_periods': time_periods
            }
            
        except Exception as e:
            logger.error(f"Error calculating cohort analysis: {str(e)}")
            raise MetricCalculationError(f"Cohort analysis failed: {str(e)}")
    
    @staticmethod
    def calculate_segmented_metrics(metric_definition,
                                  segment_field: str,
                                  start_date: datetime,
                                  end_date: datetime) -> Dict[str, Any]:
        """
        Calculate metrics segmented by a specific field
        
        Args:
            metric_definition: MetricDefinition instance
            segment_field: Field to segment by
            start_date: Start date
            end_date: End date
            
        Returns:
            Segmented metric data
        """
        try:
            model = AdvancedMetricCalculator._get_source_model(metric_definition)
            
            # Build base queryset
            queryset = model.objects.filter(
                created_at__gte=start_date,
                created_at__lte=end_date
            )
            
            # Apply metric filters
            queryset = AdvancedMetricCalculator._apply_filters(
                queryset, metric_definition.filters
            )
            
            # Get unique segment values
            segments = queryset.values_list(segment_field, flat=True).distinct()
            
            segment_data = {}
            total_value = Decimal('0')
            
            for segment in segments:
                if segment is None:
                    segment = 'Unknown'
                
                segment_queryset = queryset.filter(**{segment_field: segment})
                
                # Calculate metric for this segment
                if metric_definition.metric_type == 'COUNT':
                    value = segment_queryset.count()
                elif metric_definition.metric_type == 'SUM':
                    result = segment_queryset.aggregate(
                        total=models.Sum(metric_definition.source_field)
                    )
                    value = result['total'] or Decimal('0')
                elif metric_definition.metric_type == 'AVERAGE':
                    result = segment_queryset.aggregate(
                        avg=models.Avg(metric_definition.source_field)
                    )
                    value = result['avg'] or Decimal('0')
                else:
                    value = segment_queryset.count()
                
                segment_data[str(segment)] = {
                    'value': value,
                    'count': segment_queryset.count()
                }
                total_value += Decimal(str(value))
            
            # Calculate percentages
            for segment, data in segment_data.items():
                if total_value > 0:
                    data['percentage'] = (Decimal(str(data['value'])) / total_value) * 100
                else:
                    data['percentage'] = 0
            
            return {
                'segments': segment_data,
                'total_value': total_value,
                'segment_field': segment_field,
                'period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Error calculating segmented metrics: {str(e)}")
            raise MetricCalculationError(f"Segmented calculation failed: {str(e)}")
    
    @staticmethod
    def calculate_rolling_metrics(metric_definition,
                                end_date: datetime,
                                window_days: int = 7,
                                periods: int = 30) -> List[Dict[str, Any]]:
        """
        Calculate rolling average metrics
        
        Args:
            metric_definition: MetricDefinition instance
            end_date: End date for calculations
            window_days: Rolling window size in days
            periods: Number of periods to calculate
            
        Returns:
            List of rolling metric values
        """
        try:
            rolling_data = []
            
            for i in range(periods):
                # Calculate window end date
                window_end = end_date - timedelta(days=i)
                window_start = window_end - timedelta(days=window_days)
                
                # Calculate metric for this window
                value = AdvancedMetricCalculator._calculate_metric_for_period(
                    metric_definition, window_start, window_end
                )
                
                rolling_data.append({
                    'date': window_end.isoformat(),
                    'value': float(value) if value is not None else None,
                    'window_start': window_start.isoformat(),
                    'window_end': window_end.isoformat(),
                    'window_days': window_days
                })
            
            # Reverse to get chronological order
            rolling_data.reverse()
            
            return rolling_data
            
        except Exception as e:
            logger.error(f"Error calculating rolling metrics: {str(e)}")
            raise MetricCalculationError(f"Rolling metrics calculation failed: {str(e)}")
    
    @staticmethod
    def calculate_correlation_analysis(metric1_definition,
                                     metric2_definition,
                                     start_date: datetime,
                                     end_date: datetime,
                                     interval: str = 'daily') -> Dict[str, Any]:
        """
        Calculate correlation between two metrics
        
        Returns:
            Correlation analysis data
        """
        try:
            import numpy as np
            from scipy.stats import pearsonr
            
            # Get time series for both metrics
            metric1_data = AdvancedMetricCalculator.calculate_time_series_data(
                metric1_definition, start_date, end_date, interval
            )
            
            metric2_data = AdvancedMetricCalculator.calculate_time_series_data(
                metric2_definition, start_date, end_date, interval
            )
            
            # Align data points and extract values
            values1 = []
            values2 = []
            
            for i, point1 in enumerate(metric1_data):
                if i < len(metric2_data):
                    point2 = metric2_data[i]
                    if point1['value'] is not None and point2['value'] is not None:
                        values1.append(point1['value'])
                        values2.append(point2['value'])
            
            if len(values1) < 2:
                return {
                    'correlation': None,
                    'p_value': None,
                    'message': 'Insufficient data points for correlation analysis'
                }
            
            # Calculate correlation
            correlation, p_value = pearsonr(values1, values2)
            
            # Interpret correlation strength
            abs_corr = abs(correlation)
            if abs_corr >= 0.8:
                strength = 'Very Strong'
            elif abs_corr >= 0.6:
                strength = 'Strong'
            elif abs_corr >= 0.4:
                strength = 'Moderate'
            elif abs_corr >= 0.2:
                strength = 'Weak'
            else:
                strength = 'Very Weak'
            
            return {
                'correlation': correlation,
                'p_value': p_value,
                'strength': strength,
                'direction': 'Positive' if correlation > 0 else 'Negative' if correlation < 0 else 'None',
                'data_points': len(values1),
                'metric1': metric1_definition.name,
                'metric2': metric2_definition.name,
                'significant': p_value < 0.05 if p_value is not None else False
            }
            
        except ImportError:
            return {
                'error': 'scipy and numpy are required for correlation analysis'
            }
        except Exception as e:
            logger.error(f"Error calculating correlation: {str(e)}")
            raise MetricCalculationError(f"Correlation analysis failed: {str(e)}")
    
    @staticmethod
    def calculate_forecasting_data(metric_definition,
                                 start_date: datetime,
                                 end_date: datetime,
                                 forecast_periods: int = 30) -> Dict[str, Any]:
        """
        Calculate basic trend-based forecasting
        
        Args:
            metric_definition: MetricDefinition instance
            start_date: Historical data start date
            end_date: Historical data end date
            forecast_periods: Number of future periods to forecast
            
        Returns:
            Forecasting data with trend analysis
        """
        try:
            # Get historical time series data
            historical_data = AdvancedMetricCalculator.calculate_time_series_data(
                metric_definition, start_date, end_date, 'daily'
            )
            
            # Extract values for trend calculation
            values = [point['value'] for point in historical_data if point['value'] is not None]
            
            if len(values) < 2:
                return {
                    'error': 'Insufficient historical data for forecasting'
                }
            
            # Simple linear trend calculation
            n = len(values)
            x = list(range(n))
            
            # Calculate linear regression manually
            sum_x = sum(x)
            sum_y = sum(values)
            sum_xy = sum(xi * yi for xi, yi in zip(x, values))
            sum_x2 = sum(xi * xi for xi in x)
            
            # Linear regression coefficients
            slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x)
            intercept = (sum_y - slope * sum_x) / n
            
            # Generate forecast
            forecast_data = []
            last_date = datetime.fromisoformat(historical_data[-1]['date'])
            
            for i in range(forecast_periods):
                forecast_date = last_date + timedelta(days=i + 1)
                forecast_value = slope * (n + i) + intercept
                
                # Ensure non-negative values for count/sum metrics
                if metric_definition.metric_type in ['COUNT', 'SUM'] and forecast_value < 0:
                    forecast_value = 0
                
                forecast_data.append({
                    'date': forecast_date.isoformat(),
                    'value': max(0, forecast_value),
                    'is_forecast': True
                })
            
            # Calculate trend statistics
            recent_avg = sum(values[-7:]) / min(7, len(values))  # Last 7 days average
            overall_avg = sum(values) / len(values)
            trend_direction = 'increasing' if slope > 0 else 'decreasing' if slope < 0 else 'stable'
            
            return {
                'historical_data': historical_data,
                'forecast_data': forecast_data,
                'trend_analysis': {
                    'slope': slope,
                    'intercept': intercept,
                    'direction': trend_direction,
                    'recent_average': recent_avg,
                    'overall_average': overall_avg,
                    'data_points': n
                },
                'forecast_periods': forecast_periods
            }
            
        except Exception as e:
            logger.error(f"Error calculating forecast: {str(e)}")
            raise MetricCalculationError(f"Forecasting failed: {str(e)}")
    
    # Helper methods
    @staticmethod
    def _generate_time_points(start_date: datetime, 
                            end_date: datetime, 
                            interval: str) -> List[datetime]:
        """Generate time points for time series analysis"""
        time_points = []
        current = start_date
        
        if interval == 'hourly':
            delta = timedelta(hours=1)
        elif interval == 'daily':
            delta = timedelta(days=1)
        elif interval == 'weekly':
            delta = timedelta(weeks=1)
        elif interval == 'monthly':
            # Approximate monthly interval
            delta = timedelta(days=30)
        else:
            delta = timedelta(days=1)  # Default to daily
        
        while current < end_date:
            time_points.append(current)
            current += delta
        
        return time_points
    
    @staticmethod
    def _calculate_metric_for_period(metric_definition,
                                   start_date: datetime,
                                   end_date: datetime) -> Optional[Decimal]:
        """Calculate metric value for a specific time period"""
        from ..services import MetricDefinitionService
        
        try:
            return MetricDefinitionService.calculate_metric(
                metric_definition.id,
                start_date=start_date,
                end_date=end_date
            )
        except Exception as e:
            logger.warning(f"Error calculating metric for period: {str(e)}")
            return None
    
    @staticmethod
    def _get_source_model(metric_definition):
        """Get the Django model for the metric's data source"""
        try:
            return apps.get_model(f'core.domains.{metric_definition.source_domain}', metric_definition.source_model)
        except LookupError:
            try:
                return apps.get_model(metric_definition.source_domain, metric_definition.source_model)
            except LookupError:
                raise MetricCalculationError(f"Model not found: {metric_definition.source_domain}.{metric_definition.source_model}")
    
    @staticmethod
    def _apply_filters(queryset: QuerySet, filters: Dict[str, Any]) -> QuerySet:
        """Apply filters to a queryset"""
        try:
            for field, value in filters.items():
                if isinstance(value, dict):
                    # Handle complex filters like {"gte": 100}
                    for lookup, lookup_value in value.items():
                        queryset = queryset.filter(**{f"{field}__{lookup}": lookup_value})
                else:
                    # Handle simple filters
                    queryset = queryset.filter(**{field: value})
            return queryset
        except Exception as e:
            logger.error(f"Error applying filters: {str(e)}")
            return queryset


class MetricBenchmarkService:
    """Service for calculating metric benchmarks and performance indicators"""
    
    @staticmethod
    def calculate_performance_indicators(metric_definition,
                                       current_value: Decimal,
                                       historical_periods: int = 12) -> Dict[str, Any]:
        """
        Calculate performance indicators for a metric
        
        Args:
            metric_definition: MetricDefinition instance
            current_value: Current metric value
            historical_periods: Number of historical periods to analyze
            
        Returns:
            Performance indicators and benchmarks
        """
        try:
            end_date = timezone.now()
            start_date = end_date - timedelta(days=30 * historical_periods)
            
            # Get historical data
            historical_data = AdvancedMetricCalculator.calculate_time_series_data(
                metric_definition, start_date, end_date, 'monthly'
            )
            
            # Extract values
            historical_values = [
                Decimal(str(point['value'])) 
                for point in historical_data 
                if point['value'] is not None
            ]
            
            if not historical_values:
                return {
                    'error': 'No historical data available for benchmarking'
                }
            
            # Calculate statistics
            avg_value = sum(historical_values) / len(historical_values)
            min_value = min(historical_values)
            max_value = max(historical_values)
            
            # Calculate percentiles
            sorted_values = sorted(historical_values)
            n = len(sorted_values)
            
            p25_index = int(n * 0.25)
            p50_index = int(n * 0.50)
            p75_index = int(n * 0.75)
            p90_index = int(n * 0.90)
            
            percentiles = {
                'p25': sorted_values[p25_index] if p25_index < n else sorted_values[-1],
                'p50': sorted_values[p50_index] if p50_index < n else sorted_values[-1],
                'p75': sorted_values[p75_index] if p75_index < n else sorted_values[-1],
                'p90': sorted_values[p90_index] if p90_index < n else sorted_values[-1]
            }
            
            # Determine performance rating
            if current_value >= percentiles['p90']:
                performance_rating = 'Excellent'
                performance_score = 95
            elif current_value >= percentiles['p75']:
                performance_rating = 'Good'
                performance_score = 75
            elif current_value >= percentiles['p50']:
                performance_rating = 'Average'
                performance_score = 50
            elif current_value >= percentiles['p25']:
                performance_rating = 'Below Average'
                performance_score = 25
            else:
                performance_rating = 'Poor'
                performance_score = 10
            
            # Calculate trend
            if len(historical_values) >= 3:
                recent_trend = (historical_values[-1] - historical_values[-3]) / 2
                trend_direction = 'Improving' if recent_trend > 0 else 'Declining' if recent_trend < 0 else 'Stable'
            else:
                recent_trend = Decimal('0')
                trend_direction = 'Stable'
            
            return {
                'current_value': current_value,
                'performance_rating': performance_rating,
                'performance_score': performance_score,
                'benchmarks': {
                    'average': avg_value,
                    'minimum': min_value,
                    'maximum': max_value,
                    'percentiles': percentiles
                },
                'trend': {
                    'direction': trend_direction,
                    'recent_change': recent_trend
                },
                'historical_periods': len(historical_values),
                'analysis_period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Error calculating performance indicators: {str(e)}")
            raise MetricCalculationError(f"Performance analysis failed: {str(e)}")
    
    @staticmethod
    def calculate_goal_tracking(metric_definition,
                              target_value: Decimal,
                              target_date: datetime,
                              current_value: Decimal = None) -> Dict[str, Any]:
        """
        Calculate goal tracking metrics
        
        Args:
            metric_definition: MetricDefinition instance
            target_value: Target value to achieve
            target_date: Date by which to achieve target
            current_value: Current metric value (if not provided, will be calculated)
            
        Returns:
            Goal tracking data
        """
        try:
            if current_value is None:
                # Calculate current value
                end_date = timezone.now()
                start_date = end_date - timedelta(days=30)
                current_value = AdvancedMetricCalculator._calculate_metric_for_period(
                    metric_definition, start_date, end_date
                )
            
            if current_value is None:
                return {
                    'error': 'Unable to calculate current metric value'
                }
            
            # Calculate progress
            if target_value > 0:
                progress_percentage = (current_value / target_value) * 100
            else:
                progress_percentage = 0
            
            # Calculate remaining
            remaining_value = target_value - current_value
            remaining_percentage = 100 - progress_percentage if progress_percentage <= 100 else 0
            
            # Calculate time-based metrics
            current_date = timezone.now().date()
            target_date_obj = target_date.date() if isinstance(target_date, datetime) else target_date
            
            days_total = (target_date_obj - current_date).days if target_date_obj > current_date else 0
            days_remaining = max(0, days_total)
            
            # Calculate required daily rate
            if days_remaining > 0 and remaining_value > 0:
                required_daily_rate = remaining_value / days_remaining
            else:
                required_daily_rate = Decimal('0')
            
            # Determine status
            if progress_percentage >= 100:
                status = 'Achieved'
                status_color = 'green'
            elif progress_percentage >= 75:
                status = 'On Track'
                status_color = 'green'
            elif progress_percentage >= 50:
                status = 'Behind'
                status_color = 'orange'
            else:
                status = 'Significantly Behind'
                status_color = 'red'
            
            # Calculate projected completion
            if days_remaining > 0:
                # Simple linear projection based on current progress
                days_elapsed = (current_date - (target_date_obj - timedelta(days=days_total))).days
                if days_elapsed > 0:
                    daily_rate = current_value / days_elapsed
                    projected_days = target_value / daily_rate if daily_rate > 0 else float('inf')
                    projected_completion = current_date + timedelta(days=projected_days)
                else:
                    projected_completion = None
            else:
                projected_completion = None
            
            return {
                'goal': {
                    'target_value': target_value,
                    'target_date': target_date_obj.isoformat(),
                    'current_value': current_value
                },
                'progress': {
                    'percentage': min(100, max(0, progress_percentage)),
                    'remaining_value': remaining_value,
                    'remaining_percentage': max(0, remaining_percentage)
                },
                'timeline': {
                    'days_remaining': days_remaining,
                    'required_daily_rate': required_daily_rate,
                    'projected_completion': projected_completion.isoformat() if projected_completion else None
                },
                'status': {
                    'label': status,
                    'color': status_color,
                    'achieved': progress_percentage >= 100
                }
            }
            
        except Exception as e:
            logger.error(f"Error calculating goal tracking: {str(e)}")
            raise MetricCalculationError(f"Goal tracking failed: {str(e)}")


class MetricOptimizationService:
    """Service for metric optimization and recommendations"""
    
    @staticmethod
    def analyze_metric_optimization(metric_definition,
                                  analysis_period_days: int = 90) -> Dict[str, Any]:
        """
        Analyze metric for optimization opportunities
        
        Args:
            metric_definition: MetricDefinition instance
            analysis_period_days: Number of days to analyze
            
        Returns:
            Optimization analysis and recommendations
        """
        try:
            end_date = timezone.now()
            start_date = end_date - timedelta(days=analysis_period_days)
            
            # Get time series data
            time_series_data = AdvancedMetricCalculator.calculate_time_series_data(
                metric_definition, start_date, end_date, 'daily'
            )
            
            values = [point['value'] for point in time_series_data if point['value'] is not None]
            
            if len(values) < 7:
                return {
                    'error': 'Insufficient data for optimization analysis'
                }
            
            # Calculate variability metrics
            avg_value = sum(values) / len(values)
            variance = sum((v - avg_value) ** 2 for v in values) / len(values)
            std_dev = variance ** 0.5
            coefficient_of_variation = (std_dev / avg_value) * 100 if avg_value > 0 else 0
            
            # Analyze trends
            recent_values = values[-7:]  # Last 7 days
            older_values = values[-14:-7] if len(values) >= 14 else values[:-7]
            
            recent_avg = sum(recent_values) / len(recent_values)
            older_avg = sum(older_values) / len(older_values) if older_values else recent_avg
            
            trend_change = ((recent_avg - older_avg) / older_avg) * 100 if older_avg > 0 else 0
            
            # Generate recommendations
            recommendations = []
            
            if coefficient_of_variation > 30:
                recommendations.append({
                    'type': 'Stability',
                    'priority': 'High',
                    'message': f'High variability detected ({coefficient_of_variation:.1f}% CV). Consider investigating causes of fluctuation.',
                    'action': 'Analyze factors contributing to metric variability'
                })
            
            if trend_change < -10:
                recommendations.append({
                    'type': 'Performance',
                    'priority': 'High',
                    'message': f'Declining trend detected ({trend_change:.1f}% change). Immediate action may be required.',
                    'action': 'Investigate root causes of performance decline'
                })
            
            if trend_change > 20:
                recommendations.append({
                    'type': 'Growth',
                    'priority': 'Medium',
                    'message': f'Strong positive trend detected ({trend_change:.1f}% change). Consider scaling successful strategies.',
                    'action': 'Analyze and replicate success factors'
                })
            
            # Identify outliers
            outliers = []
            for i, value in enumerate(values):
                if abs(value - avg_value) > 2 * std_dev:
                    outliers.append({
                        'date': time_series_data[i]['date'],
                        'value': value,
                        'deviation': abs(value - avg_value)
                    })
            
            if outliers:
                recommendations.append({
                    'type': 'Data Quality',
                    'priority': 'Medium',
                    'message': f'{len(outliers)} outlier values detected that may indicate data quality issues.',
                    'action': 'Review data collection processes and validate outlier values'
                })
            
            return {
                'metric_name': metric_definition.name,
                'analysis_period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'days': analysis_period_days
                },
                'statistics': {
                    'average': avg_value,
                    'standard_deviation': std_dev,
                    'coefficient_of_variation': coefficient_of_variation,
                    'data_points': len(values)
                },
                'trend_analysis': {
                    'recent_average': recent_avg,
                    'previous_average': older_avg,
                    'change_percentage': trend_change,
                    'direction': 'Improving' if trend_change > 0 else 'Declining' if trend_change < 0 else 'Stable'
                },
                'outliers': outliers,
                'recommendations': recommendations,
                'optimization_score': MetricOptimizationService._calculate_optimization_score(
                    coefficient_of_variation, trend_change, len(outliers), len(values)
                )
            }
            
        except Exception as e:
            logger.error(f"Error analyzing metric optimization: {str(e)}")
            raise MetricCalculationError(f"Optimization analysis failed: {str(e)}")
    
    @staticmethod
    def _calculate_optimization_score(cv: float, trend_change: float, outlier_count: int, data_points: int) -> Dict[str, Any]:
        """Calculate an optimization score for the metric"""
        score = 100
        
        # Penalize high variability
        if cv > 50:
            score -= 30
        elif cv > 30:
            score -= 20
        elif cv > 15:
            score -= 10
        
        # Penalize negative trends
        if trend_change < -20:
            score -= 25
        elif trend_change < -10:
            score -= 15
        elif trend_change < 0:
            score -= 5
        
        # Reward positive trends
        if trend_change > 10:
            score += 10
        
        # Penalize outliers
        outlier_ratio = outlier_count / data_points if data_points > 0 else 0
        if outlier_ratio > 0.1:
            score -= 20
        elif outlier_ratio > 0.05:
            score -= 10
        
        # Ensure score is between 0 and 100
        score = max(0, min(100, score))
        
        # Determine grade
        if score >= 90:
            grade = 'A'
            status = 'Excellent'
        elif score >= 80:
            grade = 'B'
            status = 'Good'
        elif score >= 70:
            grade = 'C'
            status = 'Fair'
        elif score >= 60:
            grade = 'D'
            status = 'Poor'
        else:
            grade = 'F'
            status = 'Critical'
        
        return {
            'score': score,
            'grade': grade,
            'status': status
        }