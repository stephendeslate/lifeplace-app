#!/usr/bin/env python
"""
Simple test script to verify N+1 query optimizations by checking QuerySet methods.

This script inspects ViewSet querysets to ensure they have proper select_related
and prefetch_related optimizations.
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

# Import views after Django setup
from core.domains.payments.views import PaymentViewSet, InvoiceViewSet
from core.domains.sales.views import EventQuoteViewSet, QuoteTemplateViewSet
from core.domains.communications.views import CommunicationRecordViewSet
from core.domains.notes.views import NoteViewSet
from core.domains.questionnaires.views import QuestionnaireFieldViewSet, QuestionnaireResponseViewSet
from core.domains.workflows.views import WorkflowStageViewSet
from core.domains.contracts.views import ContractSignatureViewSet, ContractAmendmentViewSet


def analyze_queryset_optimization(viewset_class, viewset_name):
    """Analyze if a ViewSet's queryset is optimized."""
    try:
        # Create a mock request object
        class MockRequest:
            def __init__(self):
                self.user = None
                self.query_params = {}
        
        # Instantiate the viewset
        viewset = viewset_class()
        viewset.request = MockRequest()
        
        # Get the queryset
        if hasattr(viewset, 'get_queryset'):
            queryset = viewset.get_queryset()
        else:
            queryset = viewset.queryset
        
        # Check for optimizations
        has_select_related = bool(getattr(queryset.query, 'select_related', False))
        has_prefetch_related = bool(getattr(queryset, '_prefetch_related_lookups', False))
        
        # Get the SQL to see what joins are made
        try:
            sql_query = str(queryset.query)
            join_count = sql_query.upper().count('JOIN')
        except:
            join_count = 0
        
        result = {
            'viewset': viewset_name,
            'has_select_related': has_select_related,
            'has_prefetch_related': has_prefetch_related,
            'join_count': join_count,
            'is_optimized': has_select_related or has_prefetch_related,
            'status': '✅ OPTIMIZED' if (has_select_related or has_prefetch_related) else '❌ NOT OPTIMIZED'
        }
        
        return result
    except Exception as e:
        return {
            'viewset': viewset_name,
            'error': str(e),
            'status': '⚠️ ERROR'
        }


def main():
    """Run the optimization analysis."""
    print("N+1 Query Optimization Analysis")
    print("="*50)
    print()
    
    # List of ViewSets to test
    viewsets_to_test = [
        (PaymentViewSet, 'PaymentViewSet'),
        (InvoiceViewSet, 'InvoiceViewSet'), 
        (EventQuoteViewSet, 'EventQuoteViewSet'),
        (QuoteTemplateViewSet, 'QuoteTemplateViewSet'),
        (CommunicationRecordViewSet, 'CommunicationRecordViewSet'),
        (NoteViewSet, 'NoteViewSet'),
        (QuestionnaireFieldViewSet, 'QuestionnaireFieldViewSet'),
        (QuestionnaireResponseViewSet, 'QuestionnaireResponseViewSet'),
        (WorkflowStageViewSet, 'WorkflowStageViewSet'),
        (ContractSignatureViewSet, 'ContractSignatureViewSet'),
        (ContractAmendmentViewSet, 'ContractAmendmentViewSet'),
    ]
    
    results = []
    
    for viewset_class, viewset_name in viewsets_to_test:
        print(f"Testing {viewset_name}...")
        result = analyze_queryset_optimization(viewset_class, viewset_name)
        results.append(result)
    
    print("\nResults:")
    print("-" * 80)
    
    for result in results:
        if 'error' in result:
            print(f"{result['viewset']:<30} {result['status']:<15} Error: {result['error']}")
        else:
            select_related = "Yes" if result['has_select_related'] else "No"
            prefetch_related = "Yes" if result['has_prefetch_related'] else "No"
            print(f"{result['viewset']:<30} {result['status']:<15} "
                  f"Select: {select_related:<3} Prefetch: {prefetch_related:<3} "
                  f"Joins: {result['join_count']}")
    
    # Summary
    total = len(results)
    optimized = sum(1 for r in results if r.get('is_optimized', False))
    errors = sum(1 for r in results if 'error' in r)
    
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print(f"Total ViewSets tested: {total}")
    print(f"Optimized: {optimized}")
    print(f"Not optimized: {total - optimized - errors}")
    print(f"Errors: {errors}")
    
    if optimized == total - errors:
        print("\n🎉 All testable ViewSets are properly optimized!")
    else:
        print("\n⚠️ Some ViewSets may need optimization")


if __name__ == '__main__':
    main()