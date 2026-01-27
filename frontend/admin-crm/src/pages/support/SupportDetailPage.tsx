// frontend/admin-crm/src/pages/support/SupportDetailPage.tsx

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { InquiryDetail } from './components/InquiryDetail';

const SupportDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/support');
  };

  if (!id) {
    navigate('/support');
    return null;
  }

  return <InquiryDetail inquiryId={id} onBack={handleBack} />;
};

export default SupportDetailPage;
