/**
 * NotesTab Component
 *
 * Displays event notes (visible to client) with the ability to add new notes.
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Note, PaperPlaneTilt, User } from 'phosphor-react-native';
import { theme } from '@/theme';
import { useEventNotes, useCreateEventNote } from '@/hooks/useEvents';
import { Skeleton, EmptyState, Card } from '@/components/common';
import { formatCardDate, getRelativeTime } from '@/utils/formatting';
import type { EventNote } from '@/types/events.types';

export interface NotesTabProps {
  eventId: number;
}

export function NotesTab({ eventId }: NotesTabProps) {
  const { data: notes, isLoading, refetch, isRefetching } = useEventNotes(eventId);
  const createNote = useCreateEventNote();

  const [newNote, setNewNote] = useState('');

  const handleSubmitNote = () => {
    if (!newNote.trim()) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    createNote.mutate(
      {
        eventId,
        data: { content: newNote.trim() },
      },
      {
        onSuccess: () => {
          setNewNote('');
        },
      }
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Skeleton variant="rounded" height={100} style={styles.skeleton} />
        <Skeleton variant="rounded" height={100} style={styles.skeleton} />
        <Skeleton variant="rounded" height={100} style={styles.skeleton} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[theme.colors.primary[500]]}
            tintColor={theme.colors.primary[500]}
          />
        }
      >
        {/* Notes List */}
        {(!notes || notes.length === 0) ? (
          <EmptyState
            icon="notification"
            title="No Notes Yet"
            description="Notes from your event coordinator will appear here. You can also add notes below."
          />
        ) : (
          <View style={styles.notesList}>
            {notes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Note Input */}
      <View style={styles.inputContainer}>
        <Card style={styles.inputCard}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={newNote}
              onChangeText={setNewNote}
              placeholder="Add a note..."
              placeholderTextColor={theme.colors.neutral[400]}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              onPress={handleSubmitNote}
              disabled={!newNote.trim() || createNote.isPending}
              style={[
                styles.sendButton,
                (!newNote.trim() || createNote.isPending) && styles.sendButtonDisabled,
              ]}
              activeOpacity={0.7}
            >
              {createNote.isPending ? (
                <ActivityIndicator size="small" color={theme.colors.surface} />
              ) : (
                <PaperPlaneTilt
                  size={20}
                  color={theme.colors.surface}
                  weight="fill"
                />
              )}
            </TouchableOpacity>
          </View>
        </Card>
      </View>
    </KeyboardAvoidingView>
  );
}

interface NoteCardProps {
  note: EventNote;
}

function NoteCard({ note }: NoteCardProps) {
  const isFromClient = note.author_type === 'CLIENT';

  return (
    <View style={[styles.noteCard, isFromClient && styles.noteCardClient]}>
      {/* Author Avatar */}
      <View
        style={[
          styles.avatar,
          isFromClient ? styles.avatarClient : styles.avatarStaff,
        ]}
      >
        {note.author_avatar ? (
          <User size={16} color={theme.colors.surface} weight="fill" />
        ) : (
          <Note
            size={16}
            color={isFromClient ? theme.colors.surface : theme.colors.primary[600]}
            weight="fill"
          />
        )}
      </View>

      {/* Note Content */}
      <View style={styles.noteContent}>
        <View style={styles.noteHeader}>
          <Text style={styles.authorName}>
            {note.author_name || (isFromClient ? 'You' : 'LifePlace Team')}
          </Text>
          <Text style={styles.noteDate}>{getRelativeTime(note.created_at)}</Text>
        </View>
        <Text style={styles.noteText}>{note.content}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    padding: theme.spacing.md,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 100, // Space for input
  },
  skeleton: {
    marginBottom: theme.spacing.md,
  },
  notesList: {
    gap: theme.spacing.md,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  noteCardClient: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: theme.spacing.sm,
  },
  avatarStaff: {
    backgroundColor: theme.colors.primary[100],
  },
  avatarClient: {
    backgroundColor: theme.colors.primary[500],
  },
  noteContent: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  authorName: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[800],
  },
  noteDate: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.neutral[500],
  },
  noteText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[700],
    lineHeight: 22,
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
    padding: theme.spacing.md,
  },
  inputCard: {
    padding: theme.spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[800],
    maxHeight: 100,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary.black,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing.sm,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

export default NotesTab;
