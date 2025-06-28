# backend/core/domains/analytics/utils/chart_generators.py
import io
import base64
import logging
from typing import Dict, List, Any, Optional, Tuple
from decimal import Decimal
from datetime import datetime, timedelta
import json

try:
    import matplotlib
    matplotlib.use('Agg')  # Use non-interactive backend
    import matplotlib.pyplot as plt
    import seaborn as sns
    from matplotlib.dates import DateFormatter
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False

try:
    import plotly.graph_objects as go
    import plotly.express as px
    from plotly.utils import PlotlyJSONEncoder
    PLOTLY_AVAILABLE = True
except ImportError:
    PLOTLY_AVAILABLE = False

logger = logging.getLogger(__name__)


class ChartGenerationError(Exception):
    """Exception raised when chart generation fails"""
    pass


class ChartGenerator:
    """
    Utility class for generating charts and visualizations for analytics
    """
    
    @staticmethod
    def generate_metric_card_data(value: Decimal, title: str, format_type: str = 'number') -> Dict[str, Any]:
        """Generate data for metric card visualization"""
        try:
            formatted_value = ChartGenerator._format_value(value, format_type)
            
            return {
                'type': 'metric_card',
                'value': formatted_value,
                'raw_value': float(value),
                'title': title,
                'format': format_type,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Error generating metric card data: {str(e)}")
            raise ChartGenerationError(f"Failed to generate metric card: {str(e)}")
    
    @staticmethod
    def generate_line_chart(data: List[Dict[str, Any]], 
                          x_field: str = 'date', 
                          y_field: str = 'value',
                          title: str = 'Line Chart',
                          engine: str = 'plotly') -> Dict[str, Any]:
        """Generate line chart configuration"""
        if not data:
            return ChartGenerator._empty_chart_response('line_chart', title)
        
        try:
            if engine == 'plotly' and PLOTLY_AVAILABLE:
                return ChartGenerator._generate_plotly_line_chart(data, x_field, y_field, title)
            elif engine == 'matplotlib' and MATPLOTLIB_AVAILABLE:
                return ChartGenerator._generate_matplotlib_line_chart(data, x_field, y_field, title)
            else:
                # Fallback to basic data structure
                return ChartGenerator._generate_basic_line_chart(data, x_field, y_field, title)
        except Exception as e:
            logger.error(f"Error generating line chart: {str(e)}")
            raise ChartGenerationError(f"Failed to generate line chart: {str(e)}")
    
    @staticmethod
    def generate_bar_chart(data: List[Dict[str, Any]], 
                          x_field: str = 'category', 
                          y_field: str = 'value',
                          title: str = 'Bar Chart',
                          engine: str = 'plotly') -> Dict[str, Any]:
        """Generate bar chart configuration"""
        if not data:
            return ChartGenerator._empty_chart_response('bar_chart', title)
        
        try:
            if engine == 'plotly' and PLOTLY_AVAILABLE:
                return ChartGenerator._generate_plotly_bar_chart(data, x_field, y_field, title)
            elif engine == 'matplotlib' and MATPLOTLIB_AVAILABLE:
                return ChartGenerator._generate_matplotlib_bar_chart(data, x_field, y_field, title)
            else:
                return ChartGenerator._generate_basic_bar_chart(data, x_field, y_field, title)
        except Exception as e:
            logger.error(f"Error generating bar chart: {str(e)}")
            raise ChartGenerationError(f"Failed to generate bar chart: {str(e)}")
    
    @staticmethod
    def generate_pie_chart(data: List[Dict[str, Any]], 
                          label_field: str = 'label', 
                          value_field: str = 'value',
                          title: str = 'Pie Chart',
                          engine: str = 'plotly') -> Dict[str, Any]:
        """Generate pie chart configuration"""
        if not data:
            return ChartGenerator._empty_chart_response('pie_chart', title)
        
        try:
            if engine == 'plotly' and PLOTLY_AVAILABLE:
                return ChartGenerator._generate_plotly_pie_chart(data, label_field, value_field, title)
            elif engine == 'matplotlib' and MATPLOTLIB_AVAILABLE:
                return ChartGenerator._generate_matplotlib_pie_chart(data, label_field, value_field, title)
            else:
                return ChartGenerator._generate_basic_pie_chart(data, label_field, value_field, title)
        except Exception as e:
            logger.error(f"Error generating pie chart: {str(e)}")
            raise ChartGenerationError(f"Failed to generate pie chart: {str(e)}")
    
    @staticmethod
    def generate_funnel_chart(funnel_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate funnel visualization data"""
        try:
            steps = funnel_data.get('step_analytics', [])
            if not steps:
                return ChartGenerator._empty_chart_response('funnel_chart', 'Funnel Analysis')
            
            # Calculate funnel metrics
            total_started = funnel_data.get('total_started', 0)
            funnel_steps = []
            
            for step in steps:
                conversion_rate = step.get('conversion_rate', 0)
                completed_count = step.get('completed_count', 0)
                
                funnel_steps.append({
                    'name': step.get('step_name', f"Step {step.get('step_index', 0) + 1}"),
                    'value': completed_count,
                    'percentage': conversion_rate,
                    'drop_off': max(0, 100 - conversion_rate) if conversion_rate > 0 else 0
                })
            
            return {
                'type': 'funnel_chart',
                'title': funnel_data.get('funnel', {}).get('name', 'Funnel Analysis'),
                'data': funnel_steps,
                'total_started': total_started,
                'total_completed': funnel_data.get('total_completed', 0),
                'overall_conversion_rate': funnel_data.get('overall_conversion_rate', 0),
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Error generating funnel chart: {str(e)}")
            raise ChartGenerationError(f"Failed to generate funnel chart: {str(e)}")
    
    @staticmethod
    def generate_gauge_chart(value: float, 
                           min_value: float = 0, 
                           max_value: float = 100,
                           title: str = 'Gauge Chart',
                           thresholds: Optional[List[Dict]] = None) -> Dict[str, Any]:
        """Generate gauge chart configuration"""
        try:
            # Normalize value to percentage
            if max_value > min_value:
                percentage = ((value - min_value) / (max_value - min_value)) * 100
            else:
                percentage = 0
            
            percentage = max(0, min(100, percentage))  # Clamp between 0-100
            
            # Default thresholds if not provided
            if not thresholds:
                thresholds = [
                    {'min': 0, 'max': 30, 'color': '#f44336', 'label': 'Low'},
                    {'min': 30, 'max': 70, 'color': '#ff9800', 'label': 'Medium'},
                    {'min': 70, 'max': 100, 'color': '#4caf50', 'label': 'High'}
                ]
            
            # Determine current threshold
            current_threshold = next(
                (t for t in thresholds if t['min'] <= percentage <= t['max']),
                thresholds[0]
            )
            
            return {
                'type': 'gauge_chart',
                'title': title,
                'value': value,
                'percentage': percentage,
                'min_value': min_value,
                'max_value': max_value,
                'thresholds': thresholds,
                'current_threshold': current_threshold,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Error generating gauge chart: {str(e)}")
            raise ChartGenerationError(f"Failed to generate gauge chart: {str(e)}")
    
    # Plotly implementations
    @staticmethod
    def _generate_plotly_line_chart(data: List[Dict], x_field: str, y_field: str, title: str) -> Dict[str, Any]:
        """Generate Plotly line chart"""
        x_values = [item.get(x_field) for item in data]
        y_values = [float(item.get(y_field, 0)) for item in data]
        
        fig = go.Figure()
        fig.add_trace(go.Scatter(
            x=x_values,
            y=y_values,
            mode='lines+markers',
            name='Value',
            line=dict(color='#2196F3', width=3),
            marker=dict(size=6, color='#2196F3')
        ))
        
        fig.update_layout(
            title=title,
            xaxis_title=x_field.replace('_', ' ').title(),
            yaxis_title=y_field.replace('_', ' ').title(),
            template='plotly_white',
            height=400
        )
        
        return {
            'type': 'line_chart',
            'title': title,
            'engine': 'plotly',
            'config': json.loads(fig.to_json()),
            'data': data,
            'timestamp': datetime.now().isoformat()
        }
    
    @staticmethod
    def _generate_plotly_bar_chart(data: List[Dict], x_field: str, y_field: str, title: str) -> Dict[str, Any]:
        """Generate Plotly bar chart"""
        x_values = [str(item.get(x_field, '')) for item in data]
        y_values = [float(item.get(y_field, 0)) for item in data]
        
        fig = go.Figure()
        fig.add_trace(go.Bar(
            x=x_values,
            y=y_values,
            marker_color='#4CAF50',
            name='Value'
        ))
        
        fig.update_layout(
            title=title,
            xaxis_title=x_field.replace('_', ' ').title(),
            yaxis_title=y_field.replace('_', ' ').title(),
            template='plotly_white',
            height=400
        )
        
        return {
            'type': 'bar_chart',
            'title': title,
            'engine': 'plotly',
            'config': json.loads(fig.to_json()),
            'data': data,
            'timestamp': datetime.now().isoformat()
        }
    
    @staticmethod
    def _generate_plotly_pie_chart(data: List[Dict], label_field: str, value_field: str, title: str) -> Dict[str, Any]:
        """Generate Plotly pie chart"""
        labels = [str(item.get(label_field, '')) for item in data]
        values = [float(item.get(value_field, 0)) for item in data]
        
        fig = go.Figure()
        fig.add_trace(go.Pie(
            labels=labels,
            values=values,
            hole=0.3,  # Donut chart
            marker=dict(colors=px.colors.qualitative.Set3)
        ))
        
        fig.update_layout(
            title=title,
            template='plotly_white',
            height=400
        )
        
        return {
            'type': 'pie_chart',
            'title': title,
            'engine': 'plotly',
            'config': json.loads(fig.to_json()),
            'data': data,
            'timestamp': datetime.now().isoformat()
        }
    
    # Matplotlib implementations
    @staticmethod
    def _generate_matplotlib_line_chart(data: List[Dict], x_field: str, y_field: str, title: str) -> Dict[str, Any]:
        """Generate Matplotlib line chart as base64 image"""
        plt.figure(figsize=(10, 6))
        
        x_values = [item.get(x_field) for item in data]
        y_values = [float(item.get(y_field, 0)) for item in data]
        
        plt.plot(x_values, y_values, marker='o', linewidth=2, markersize=6)
        plt.title(title)
        plt.xlabel(x_field.replace('_', ' ').title())
        plt.ylabel(y_field.replace('_', ' ').title())
        plt.grid(True, alpha=0.3)
        plt.xticks(rotation=45)
        plt.tight_layout()
        
        # Convert to base64
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.getvalue()).decode()
        plt.close()
        
        return {
            'type': 'line_chart',
            'title': title,
            'engine': 'matplotlib',
            'image': f'data:image/png;base64,{image_base64}',
            'data': data,
            'timestamp': datetime.now().isoformat()
        }
    
    @staticmethod
    def _generate_matplotlib_bar_chart(data: List[Dict], x_field: str, y_field: str, title: str) -> Dict[str, Any]:
        """Generate Matplotlib bar chart as base64 image"""
        plt.figure(figsize=(10, 6))
        
        x_values = [str(item.get(x_field, '')) for item in data]
        y_values = [float(item.get(y_field, 0)) for item in data]
        
        plt.bar(x_values, y_values, color='#4CAF50', alpha=0.8)
        plt.title(title)
        plt.xlabel(x_field.replace('_', ' ').title())
        plt.ylabel(y_field.replace('_', ' ').title())
        plt.xticks(rotation=45)
        plt.tight_layout()
        
        # Convert to base64
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.getvalue()).decode()
        plt.close()
        
        return {
            'type': 'bar_chart',
            'title': title,
            'engine': 'matplotlib',
            'image': f'data:image/png;base64,{image_base64}',
            'data': data,
            'timestamp': datetime.now().isoformat()
        }
    
    @staticmethod
    def _generate_matplotlib_pie_chart(data: List[Dict], label_field: str, value_field: str, title: str) -> Dict[str, Any]:
        """Generate Matplotlib pie chart as base64 image"""
        plt.figure(figsize=(8, 8))
        
        labels = [str(item.get(label_field, '')) for item in data]
        values = [float(item.get(value_field, 0)) for item in data]
        
        colors = plt.cm.Set3(range(len(labels)))
        plt.pie(values, labels=labels, autopct='%1.1f%%', colors=colors, startangle=90)
        plt.title(title)
        plt.axis('equal')
        
        # Convert to base64
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.getvalue()).decode()
        plt.close()
        
        return {
            'type': 'pie_chart',
            'title': title,
            'engine': 'matplotlib',
            'image': f'data:image/png;base64,{image_base64}',
            'data': data,
            'timestamp': datetime.now().isoformat()
        }
    
    # Basic implementations (fallback)
    @staticmethod
    def _generate_basic_line_chart(data: List[Dict], x_field: str, y_field: str, title: str) -> Dict[str, Any]:
        """Generate basic line chart data structure"""
        return {
            'type': 'line_chart',
            'title': title,
            'engine': 'basic',
            'data': data,
            'x_field': x_field,
            'y_field': y_field,
            'timestamp': datetime.now().isoformat()
        }
    
    @staticmethod
    def _generate_basic_bar_chart(data: List[Dict], x_field: str, y_field: str, title: str) -> Dict[str, Any]:
        """Generate basic bar chart data structure"""
        return {
            'type': 'bar_chart',
            'title': title,
            'engine': 'basic',
            'data': data,
            'x_field': x_field,
            'y_field': y_field,
            'timestamp': datetime.now().isoformat()
        }
    
    @staticmethod
    def _generate_basic_pie_chart(data: List[Dict], label_field: str, value_field: str, title: str) -> Dict[str, Any]:
        """Generate basic pie chart data structure"""
        return {
            'type': 'pie_chart',
            'title': title,
            'engine': 'basic',
            'data': data,
            'label_field': label_field,
            'value_field': value_field,
            'timestamp': datetime.now().isoformat()
        }
    
    # Helper methods
    @staticmethod
    def _format_value(value: Decimal, format_type: str) -> str:
        """Format a value according to its type"""
        try:
            if format_type == 'currency':
                return f"${value:,.2f}"
            elif format_type == 'percentage':
                return f"{value:.1f}%"
            elif format_type == 'number':
                if value.as_tuple().exponent >= 0:  # Integer
                    return f"{int(value):,}"
                else:  # Decimal
                    return f"{value:,.2f}"
            else:
                return str(value)
        except:
            return str(value)
    
    @staticmethod
    def _empty_chart_response(chart_type: str, title: str) -> Dict[str, Any]:
        """Return empty chart response when no data available"""
        return {
            'type': chart_type,
            'title': title,
            'data': [],
            'empty': True,
            'message': 'No data available',
            'timestamp': datetime.now().isoformat()
        }


class DashboardVisualizationService:
    """Service for generating complete dashboard visualizations"""
    
    @staticmethod
    def generate_dashboard_data(dashboard, time_range: str = 'last_30_days') -> Dict[str, Any]:
        """Generate complete dashboard data with all widget visualizations"""
        from ..services import DashboardService
        
        try:
            # Get dashboard data using existing service
            dashboard_data = DashboardService.get_dashboard_data(
                dashboard.id, 
                user=None,  # System call
                time_range=time_range
            )
            
            # Enhance with visualization data
            enhanced_widgets = []
            for widget_data in dashboard_data['widgets_data']:
                widget = widget_data['widget']
                value = widget_data['value']
                error = widget_data['error']
                
                if error:
                    visualization = {
                        'type': widget.widget_type.lower(),
                        'title': widget.title,
                        'error': error,
                        'timestamp': datetime.now().isoformat()
                    }
                else:
                    visualization = DashboardVisualizationService._generate_widget_visualization(
                        widget, value
                    )
                
                enhanced_widgets.append({
                    **widget_data,
                    'visualization': visualization
                })
            
            return {
                **dashboard_data,
                'widgets_data': enhanced_widgets,
                'generated_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating dashboard visualization: {str(e)}")
            raise ChartGenerationError(f"Failed to generate dashboard visualization: {str(e)}")
    
    @staticmethod
    def _generate_widget_visualization(widget, value) -> Dict[str, Any]:
        """Generate visualization for a specific widget"""
        widget_type = widget.widget_type.lower()
        title = widget.title
        
        try:
            if widget_type == 'metric_card':
                return ChartGenerator.generate_metric_card_data(
                    value=Decimal(str(value)) if value else Decimal('0'),
                    title=title,
                    format_type=widget.metric_definition.display_format
                )
            elif widget_type == 'gauge':
                chart_config = widget.chart_config or {}
                return ChartGenerator.generate_gauge_chart(
                    value=float(value) if value else 0,
                    min_value=chart_config.get('min_value', 0),
                    max_value=chart_config.get('max_value', 100),
                    title=title
                )
            else:
                # For other chart types, we'd need historical data
                # This would require additional service methods to fetch time-series data
                return {
                    'type': widget_type,
                    'title': title,
                    'value': value,
                    'message': 'Chart visualization requires historical data implementation',
                    'timestamp': datetime.now().isoformat()
                }
        except Exception as e:
            logger.error(f"Error generating widget visualization: {str(e)}")
            return {
                'type': widget_type,
                'title': title,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }