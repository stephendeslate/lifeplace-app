"""
Redis health monitoring Django management command
"""
from django.core.management.base import BaseCommand
from core.utils.redis_monitoring import RedisHealthMonitor, RedisAlertManager
import json

class Command(BaseCommand):
    help = 'Monitor Redis health and performance'
    
    def add_arguments(self, parser):
        parser.add_argument('--format', choices=['json', 'text'], default='text',
                          help='Output format')
        parser.add_argument('--alerts-only', action='store_true', 
                          help='Show only alerts')
        parser.add_argument('--memory', action='store_true',
                          help='Include memory usage details')
        parser.add_argument('--performance', action='store_true',
                          help='Include performance metrics')
        parser.add_argument('--cleanup', action='store_true',
                          help='Run cleanup operations')
    
    def handle(self, *args, **options):
        monitor = RedisHealthMonitor()
        alert_manager = RedisAlertManager()
        
        # Run cleanup if requested
        if options['cleanup']:
            self.stdout.write("🧹 Running Redis cleanup operations...")
            cleanup_results = monitor.cleanup_expired_keys()
            for db_name, result in cleanup_results.items():
                if 'error' not in result:
                    self.stdout.write(f"  {db_name}: Cleaned {result['keys_cleaned']} expired keys")
                else:
                    self.stdout.write(f"  {db_name}: Cleanup failed - {result['error']}")
            self.stdout.write("")
        
        # Get health data
        health_data = monitor.check_health()
        
        if options['alerts_only']:
            alerts = alert_manager.check_alerts(health_data)
            if options['format'] == 'json':
                self.stdout.write(json.dumps(alerts, indent=2))
            else:
                if alerts:
                    for alert in alerts:
                        self.stdout.write(alert_manager.format_alert_message(alert))
                else:
                    self.stdout.write("✅ No alerts")
            return
        
        # Full report
        if options['format'] == 'json':
            report = health_data
            
            if options['memory']:
                report['memory_details'] = monitor.get_memory_usage()
                
            if options['performance']:
                report['performance_metrics'] = monitor.get_performance_metrics()
                
            self.stdout.write(json.dumps(report, indent=2))
            
        else:
            # Text format
            self.stdout.write(f"🔍 Redis Health Report - {health_data['timestamp']}")
            self.stdout.write("=" * 60)
            
            # Overall status
            status_emoji = "✅" if health_data['overall_status'] == 'healthy' else "❌"
            self.stdout.write(f"\n{status_emoji} Overall Status: {health_data['overall_status'].upper()}")
            
            # Database status
            for db_name, db_data in health_data['databases'].items():
                self.stdout.write(f"\n📊 Database: {db_name}")
                if db_data.get('status') == 'healthy':
                    self.stdout.write(f"  ✅ Status: Healthy")
                    self.stdout.write(f"  📊 Ping: {db_data['ping_time_ms']}ms")
                    self.stdout.write(f"  🎯 Hit Ratio: {db_data['hit_ratio']}%")
                    self.stdout.write(f"  🔗 Connections: {db_data['connected_clients']}")
                    self.stdout.write(f"  💾 Memory: {db_data['used_memory_human']}")
                    self.stdout.write(f"  📈 Commands: {db_data['total_commands_processed']:,}")
                else:
                    self.stdout.write(f"  ❌ Status: Unhealthy - {db_data.get('error', 'Unknown error')}")
            
            # Alerts
            if health_data['alerts']:
                self.stdout.write("\n🚨 ALERTS:")
                for alert in health_data['alerts']:
                    self.stdout.write(f"  {alert_manager.format_alert_message(alert)}")
            else:
                self.stdout.write("\n✅ No alerts")
            
            # Performance
            perf = health_data['performance']
            if perf.get('write_time_ms'):
                self.stdout.write("\n⚡ Performance Test:")
                self.stdout.write(f"  📝 Write: {perf['write_time_ms']}ms")
                self.stdout.write(f"  📖 Read: {perf['read_time_ms']}ms")
                self.stdout.write(f"  ✅ Data Integrity: {'PASS' if perf['data_integrity'] else 'FAIL'}")
            
            # Additional details if requested
            if options['memory']:
                self.stdout.write("\n💾 MEMORY USAGE DETAILS:")
                memory_data = monitor.get_memory_usage()
                for db_name, mem_data in memory_data.items():
                    if 'error' not in mem_data:
                        self.stdout.write(f"  {db_name}:")
                        self.stdout.write(f"    Used: {mem_data['used_memory_human']}")
                        self.stdout.write(f"    Peak: {mem_data['used_memory_peak_human']}")
                        self.stdout.write(f"    Fragmentation: {mem_data['mem_fragmentation_ratio']:.2f}")
                    else:
                        self.stdout.write(f"  {db_name}: Error - {mem_data['error']}")
            
            if options['performance']:
                self.stdout.write("\n📈 PERFORMANCE METRICS:")
                perf_data = monitor.get_performance_metrics()
                for db_name, db_metrics in perf_data.get('databases', {}).items():
                    if 'error' not in db_metrics:
                        self.stdout.write(f"  {db_name}:")
                        self.stdout.write(f"    Commands/sec: {db_metrics.get('commands_per_second', 0)}")
                        self.stdout.write(f"    Total commands: {db_metrics.get('commands_processed', 0):,}")
                        self.stdout.write(f"    Connected clients: {db_metrics.get('connected_clients', 0)}")
                    else:
                        self.stdout.write(f"  {db_name}: Error - {db_metrics['error']}")