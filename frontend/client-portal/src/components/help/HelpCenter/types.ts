export interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  views: number;
  helpful: number;
  lastUpdated: string;
  author: string;
  readTime: number;
}

export interface VideoTutorial {
  id: string;
  title: string;
  description: string;
  duration: string;
  thumbnail: string;
  category: string;
  views: number;
  rating: number;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful: number;
}
