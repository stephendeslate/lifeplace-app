"""
Django Admin Configuration for Messaging Models
"""
from django.contrib import admin
from django.utils.html import format_html
from .models import (
    MessageThread, Message, ThreadParticipant, 
    MessageAttachment, MessageReadReceipt, TypingIndicator
)


@admin.register(MessageThread)
class MessageThreadAdmin(admin.ModelAdmin):
    """Admin interface for MessageThread"""
    list_display = [
        'id', 'client_display', 'event_name_display', 'status',
        'priority', 'assigned_admin', 'last_message_at', 'created_at'
    ]
    list_filter = ['status', 'priority', 'created_at', 'last_message_at']
    search_fields = ['client__email', 'client__first_name', 'client__last_name', 'event__name']
    raw_id_fields = ['client', 'event', 'assigned_admin']
    readonly_fields = ['id', 'last_message_at', 'last_message_content', 'last_message_sender_name']
    
    fieldsets = (
        (None, {
            'fields': ('id', 'client', 'event', 'assigned_admin')
        }),
        ('Thread Details', {
            'fields': ('subject', 'status', 'priority')
        }),
        ('Last Message Cache', {
            'fields': ('last_message_at', 'last_message_content', 'last_message_sender_name'),
            'classes': ('collapse',)
        }),
    )
    
    def client_display(self, obj):
        return obj.client.get_display_name()
    client_display.short_description = 'Client'
    
    def event_name_display(self, obj):
        if obj.event:
            return obj.event.name or f"Event #{obj.event.id}"
        return "General Thread"
    event_name_display.short_description = 'Event'


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    """Admin interface for Message"""
    list_display = [
        'id', 'thread_display', 'sender_display', 'message_type', 
        'is_internal_note', 'created_at', 'content_preview'
    ]
    list_filter = ['message_type', 'is_internal_note', 'created_at']
    search_fields = ['content', 'sender__email', 'thread__client__email']
    raw_id_fields = ['thread', 'sender', 'parent_message']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        (None, {
            'fields': ('id', 'thread', 'sender', 'parent_message')
        }),
        ('Message Content', {
            'fields': ('content', 'message_type', 'is_internal_note')
        }),
        ('Edit History', {
            'fields': ('edited_at', 'original_content'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def thread_display(self, obj):
        return str(obj.thread)[:50] + "..." if len(str(obj.thread)) > 50 else str(obj.thread)
    thread_display.short_description = 'Thread'
    
    def sender_display(self, obj):
        return obj.sender.get_display_name()
    sender_display.short_description = 'Sender'
    
    def content_preview(self, obj):
        preview = obj.content[:100] + "..." if len(obj.content) > 100 else obj.content
        if obj.is_internal_note:
            return format_html('<span style="color: #666; font-style: italic;">Internal: {}</span>', preview)
        return preview
    content_preview.short_description = 'Content'


@admin.register(ThreadParticipant)
class ThreadParticipantAdmin(admin.ModelAdmin):
    """Admin interface for ThreadParticipant"""
    list_display = ['thread_display', 'user_display', 'is_active', 'notifications_enabled', 'joined_at']
    list_filter = ['is_active', 'notifications_enabled', 'joined_at']
    search_fields = ['thread__client__email', 'user__email']
    raw_id_fields = ['thread', 'user']
    
    def thread_display(self, obj):
        return str(obj.thread)[:50] + "..." if len(str(obj.thread)) > 50 else str(obj.thread)
    thread_display.short_description = 'Thread'
    
    def user_display(self, obj):
        return obj.user.get_display_name()
    user_display.short_description = 'User'


@admin.register(MessageAttachment)
class MessageAttachmentAdmin(admin.ModelAdmin):
    """Admin interface for MessageAttachment"""
    list_display = ['id', 'filename', 'message_display', 'file_size_display', 'uploaded_by', 'created_at']
    list_filter = ['file_type', 'created_at']
    search_fields = ['filename', 'message__thread__client__email']
    raw_id_fields = ['message', 'uploaded_by']
    readonly_fields = ['id', 'file_size', 'file_type', 'file_url']
    
    def message_display(self, obj):
        return f"Message in {obj.message.thread}"
    message_display.short_description = 'Message'
    
    def file_size_display(self, obj):
        if obj.file_size < 1024:
            return f"{obj.file_size} B"
        elif obj.file_size < 1024 * 1024:
            return f"{obj.file_size / 1024:.1f} KB"
        else:
            return f"{obj.file_size / (1024 * 1024):.1f} MB"
    file_size_display.short_description = 'Size'


@admin.register(MessageReadReceipt)
class MessageReadReceiptAdmin(admin.ModelAdmin):
    """Admin interface for MessageReadReceipt"""
    list_display = ['message_display', 'user_display', 'read_at']
    list_filter = ['read_at']
    search_fields = ['message__content', 'user__email']
    raw_id_fields = ['message', 'user']
    
    def message_display(self, obj):
        preview = obj.message.content[:50] + "..." if len(obj.message.content) > 50 else obj.message.content
        return preview
    message_display.short_description = 'Message'
    
    def user_display(self, obj):
        return obj.user.get_display_name()
    user_display.short_description = 'User'


@admin.register(TypingIndicator)
class TypingIndicatorAdmin(admin.ModelAdmin):
    """Admin interface for TypingIndicator"""
    list_display = ['thread_display', 'user_display', 'is_typing', 'last_activity']
    list_filter = ['is_typing', 'last_activity']
    search_fields = ['thread__client__email', 'user__email']
    raw_id_fields = ['thread', 'user']
    
    def thread_display(self, obj):
        return str(obj.thread)[:50] + "..." if len(str(obj.thread)) > 50 else str(obj.thread)
    thread_display.short_description = 'Thread'
    
    def user_display(self, obj):
        return obj.user.get_display_name()
    user_display.short_description = 'User'