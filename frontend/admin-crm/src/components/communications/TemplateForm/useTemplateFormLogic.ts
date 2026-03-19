import { useState, useEffect, useRef, useMemo } from 'react';
import { useCommunications } from '@/hooks/useCommunications';
import { useLayouts } from '@/hooks/useLayouts';
import type {
  CommunicationTemplate,
  CreateTemplateData,
  UpdateTemplateData,
} from '@/types/communications.types';
import type { TemplateContentEditorHandle } from '@/components/shared';
import type { ContextType, TemplateEditorMode } from '@/types/templates.types';
import { templateContentData } from './templateContentData';

interface UseTemplateFormLogicParams {
  template?: CommunicationTemplate;
  onSave: () => void;
}

export function useTemplateFormLogic({ template, onSave }: UseTemplateFormLogicParams) {
  const [formData, setFormData] = useState<CreateTemplateData>({
    name: '',
    channel: 'EMAIL',
    category: 'MANUAL',
    context_type: 'MANUAL' as ContextType,
    include_client_context: false,
    include_event_context: false,
    subject_template: '',
    body_template: '',
    layout: null,
  });

  const [editorMode, setEditorMode] = useState<TemplateEditorMode>('visual');
  const editorRef = useRef<TemplateContentEditorHandle>(null);

  const {
    useCreateTemplate,
    useUpdateTemplate,
    useVariableSchemas,
    usePreviewTemplate,
    useSendTest,
  } = useCommunications();
  const { useAllLayouts } = useLayouts();
  const { data: layouts = [], isLoading: layoutsLoading } = useAllLayouts({
    is_active: true,
  });
  const { mutate: createTemplate, isPending: isCreating } = useCreateTemplate();
  const { mutate: updateTemplate, isPending: isUpdating } = useUpdateTemplate();
  const { data: variableSchemas } = useVariableSchemas();
  const {
    mutate: previewTemplate,
    data: previewResult,
    isPending: isPreviewing,
  } = usePreviewTemplate();

  const { mutate: sendTest, isPending: isSendingTest } = useSendTest();
  const [testRecipient, setTestRecipient] = useState('');
  const [showTestSend, setShowTestSend] = useState(false);

  const isEditing = !!template;
  const isLoading = isCreating || isUpdating;

  const samplePreviewData = useMemo(
    () => ({
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      company: 'Example Corp',
      site_name: 'LifePlace',
      current_date: new Date().toLocaleDateString(),
      support_email: 'support@lifeplace.com',
      invitation_link: 'https://app.lifeplace.com/accept-invitation/123',
      invited_by: 'Jane Smith',
      expiry_date: 'December 31, 2024',
      event_name: 'Annual Gala',
      event_date: 'March 15, 2024',
      venue: 'Grand Ballroom',
      client_name: 'John Doe',
      phone: '(555) 123-4567',
    }),
    [],
  );

  const [debouncedBody, setDebouncedBody] = useState(formData.body_template);
  const [debouncedSubject, setDebouncedSubject] = useState(formData.subject_template);
  const [debouncedLayout, setDebouncedLayout] = useState(formData.layout);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedBody(formData.body_template);
      setDebouncedSubject(formData.subject_template);
      setDebouncedLayout(formData.layout);
    }, 800);
    return () => clearTimeout(timer);
  }, [formData.body_template, formData.subject_template, formData.layout]);

  useEffect(() => {
    if (isEditing && template?.id && debouncedBody) {
      previewTemplate({
        id: template.id,
        data: {
          template_id: template.id,
          context_data: samplePreviewData,
          body_template: debouncedBody,
          subject_template: debouncedSubject || undefined,
          layout_id: debouncedLayout,
        },
      });
    }
  }, [
    isEditing,
    template?.id,
    debouncedBody,
    debouncedSubject,
    debouncedLayout,
    previewTemplate,
    samplePreviewData,
  ]);

  const livePreview = useMemo(() => {
    if (isEditing && previewResult) {
      return {
        subject: previewResult.subject || '',
        body: previewResult.body || '',
      };
    }

    if (!formData.body_template) return { subject: '', body: '' };

    const substituteVariables = (text: string) => {
      let result = text;

      result = result.replace(/<span[^>]*>\s*\{\{\s*(\w+)\s*\}\}\s*<\/span>/gi, (_, varName) => {
        const value = samplePreviewData[varName as keyof typeof samplePreviewData];
        return value !== undefined ? String(value) : `{{ ${varName} }}`;
      });

      result = result.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, varName) => {
        const value = samplePreviewData[varName as keyof typeof samplePreviewData];
        return value !== undefined ? String(value) : match;
      });

      return result;
    };

    return {
      subject: substituteVariables(formData.subject_template || ''),
      body: substituteVariables(formData.body_template),
    };
  }, [
    isEditing,
    previewResult,
    formData.body_template,
    formData.subject_template,
    samplePreviewData,
  ]);

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        channel: template.channel,
        category: template.category,
        context_type: (template.context_type || 'MANUAL') as ContextType,
        include_client_context: template.include_client_context || false,
        include_event_context: template.include_event_context || false,
        subject_template: template.subject_template || '',
        body_template: template.body_template,
        layout: template.layout,
      });
    }
  }, [template]);

  const handleInputChange = (field: keyof CreateTemplateData, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing && template) {
      updateTemplate(
        { id: template.id, data: formData as UpdateTemplateData },
        { onSuccess: onSave },
      );
    } else {
      createTemplate(formData, { onSuccess: onSave });
    }
  };

  const handleSendTest = () => {
    if (!template?.id || !testRecipient.trim()) return;
    sendTest(
      { templateId: template.id, data: { recipient: testRecipient.trim() } },
      {
        onSuccess: () => {
          setShowTestSend(false);
          setTestRecipient('');
        },
      },
    );
  };

  const handleVariableInsert = (variable: string) => {
    if (editorRef.current) {
      editorRef.current.insertVariable(variable);
    }
  };

  const loadTemplate = (templateKey: string) => {
    const templateContent = templateContentData[templateKey];

    if (templateContent) {
      handleInputChange('subject_template', templateContent.subject);
      handleInputChange('body_template', templateContent.body);
    }
  };

  return {
    formData,
    editorMode,
    setEditorMode,
    editorRef,
    layouts,
    layoutsLoading,
    variableSchemas,
    isPreviewing,
    isSendingTest,
    testRecipient,
    setTestRecipient,
    showTestSend,
    setShowTestSend,
    isEditing,
    isLoading,
    livePreview,
    handleInputChange,
    handleSubmit,
    handleSendTest,
    handleVariableInsert,
    loadTemplate,
  };
}
