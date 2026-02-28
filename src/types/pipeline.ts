export type PipelineStage = "Idea" | "Research" | "Outline" | "Script/Draft" | "Media/Design" | "Review" | "Scheduled" | "Published";
export type ContentType = "youtube" | "social" | "blog" | "other";
export type ContentPriority = "High" | "Medium" | "Low";

export interface PipelineImage {
  path: string;
  caption: string;
}

export interface PipelineItem {
  id: number;
  title: string;
  type: ContentType;
  stage: PipelineStage;
  priority: ContentPriority;
  assignee: string;
  description: string;
  script: string;
  outline: string;
  research: string;
  notes: string;
  images: PipelineImage[];
  createdAt: string;
  updatedAt: string;
}

export interface PipelineData {
  project: string;
  lastUpdated: string;
  stages: PipelineStage[];
  contentTypes: ContentType[];
  items: PipelineItem[];
}
