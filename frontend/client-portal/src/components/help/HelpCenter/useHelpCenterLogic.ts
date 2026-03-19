import { useState, useMemo } from 'react';
import type React from 'react';
import { faqs, articles, tutorials } from './data';

export function useHelpCenterLogic() {
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>(false);

  const handleAccordionChange =
    (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
      setExpandedAccordion(isExpanded ? panel : false);
    };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleHelpfulClick = (type: 'up' | 'down', id: string) => {
    if (import.meta.env.DEV) console.log(`Marked ${type} for item ${id}`);
  };

  const filteredContent = useMemo(
    () => ({
      faqs: faqs.filter(
        (faq) =>
          !searchQuery ||
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
      articles: articles.filter(
        (article) =>
          !searchQuery ||
          article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          article.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())),
      ),
      tutorials: tutorials.filter(
        (tutorial) =>
          !searchQuery ||
          tutorial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tutorial.description.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    }),
    [searchQuery],
  );

  return {
    activeTab,
    searchQuery,
    setSearchQuery,
    expandedAccordion,
    handleAccordionChange,
    handleTabChange,
    handleHelpfulClick,
    filteredContent,
  };
}
