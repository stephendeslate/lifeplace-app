import { useState, useEffect } from 'react';
import { useQuestionnaireResponses } from '@/hooks/useQuestionnaires';
import {
  useEventQuestionnairesForEvent,
  useDeleteEventQuestionnaire,
  useSendEventQuestionnaire,
  useSendQuestionnaireReminder,
} from '@/hooks/useEventQuestionnaires';
import type { SaveEventResponsesData, EventQuestionnaire } from '@/types/questionnaires.types';

interface ResponseFormData {
  [fieldId: number]: string;
}

export function useEventQuestionnairesLogic(eventId: number) {
  const [editMode, setEditMode] = useState(false);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<EventQuestionnaire | null>(
    null,
  );
  const [formData, setFormData] = useState<ResponseFormData>({});
  const [expandedPanel, setExpandedPanel] = useState<string | false>(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuTargetId, setMenuTargetId] = useState<number | null>(null);

  const {
    data: eventQuestionnaires = [],
    isLoading: isLoadingQuestionnaires,
    refetch: refetchEventQuestionnaires,
  } = useEventQuestionnairesForEvent(eventId);

  const {
    responses,
    isLoadingResponses,
    saveEventResponses,
    isSavingEventResponses,
    refetchResponses,
  } = useQuestionnaireResponses({ event_id: eventId });

  const deleteEventQuestionnaire = useDeleteEventQuestionnaire();
  const sendEventQuestionnaire = useSendEventQuestionnaire();
  const sendReminder = useSendQuestionnaireReminder();

  useEffect(() => {
    if (responses && responses.length > 0) {
      const initialData: ResponseFormData = {};
      responses.forEach((response) => {
        initialData[response.field] = response.value;
      });
      setFormData(initialData);
    }
  }, [responses]);

  const handlePanelChange = (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  const handleFieldChange = (fieldId: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleSave = async () => {
    if (!selectedQuestionnaire?.questionnaire_detail) return;

    const responsesData: SaveEventResponsesData = {
      event: eventId,
      responses: Object.entries(formData)
        .filter(([fieldId, value]) => {
          const field = selectedQuestionnaire.questionnaire_detail?.fields?.find(
            (f) => f.id === parseInt(fieldId),
          );
          return field && value !== '';
        })
        .map(([fieldId, value]) => ({
          field: parseInt(fieldId),
          value,
        })),
    };

    saveEventResponses(responsesData, {
      onSuccess: () => {
        setEditMode(false);
        refetchResponses();
        refetchEventQuestionnaires();
      },
    });
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, questionnaireId: number) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setMenuTargetId(questionnaireId);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuTargetId(null);
  };

  const handleSend = (id: number) => {
    sendEventQuestionnaire.mutate(id, {
      onSuccess: () => {
        refetchEventQuestionnaires();
      },
    });
    handleMenuClose();
  };

  const handleSendReminder = (id: number) => {
    sendReminder.mutate(id, {
      onSuccess: () => {
        refetchEventQuestionnaires();
      },
    });
    handleMenuClose();
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to remove this questionnaire assignment?')) {
      deleteEventQuestionnaire.mutate(id, {
        onSuccess: () => {
          refetchEventQuestionnaires();
        },
      });
    }
    handleMenuClose();
  };

  const handleAssignSuccess = () => {
    refetchEventQuestionnaires();
  };

  const handleStartEdit = () => {
    setEditMode(true);
    if (eventQuestionnaires.length > 0) {
      setSelectedQuestionnaire(eventQuestionnaires[0]);
      setExpandedPanel(eventQuestionnaires[0].id.toString());
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    if (responses && responses.length > 0) {
      const savedData: ResponseFormData = {};
      responses.forEach((response) => {
        savedData[response.field] = response.value;
      });
      setFormData(savedData);
    }
  };

  return {
    editMode,
    selectedQuestionnaire,
    formData,
    expandedPanel,
    assignDialogOpen,
    setAssignDialogOpen,
    menuAnchorEl,
    menuTargetId,
    eventQuestionnaires,
    isLoadingQuestionnaires,
    isLoadingResponses,
    isSavingEventResponses,
    sendEventQuestionnaire,
    sendReminder,
    handlePanelChange,
    handleFieldChange,
    handleSave,
    handleMenuOpen,
    handleMenuClose,
    handleSend,
    handleSendReminder,
    handleDelete,
    handleAssignSuccess,
    handleStartEdit,
    handleCancelEdit,
  };
}
