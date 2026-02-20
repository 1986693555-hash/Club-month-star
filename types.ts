export enum AwardType {
  PRACTICE_STAR = '苦练之星', // Practice Star
  PROGRESS_STAR = '进步之星', // Progress Star
}

export interface StudentData {
  id: string;
  name: string;
  campus: string;
  attendance: number;
}

export interface Winner {
  studentId: string;
  studentName: string;
  campus: string;
  awardType: AwardType;
  statValue: number; // Attendance count or improvement count
  imageUrl?: string; // Original upload
  processedImageUrl?: string; // AI Processed
  quote?: string; // AI Generated Quote
  editPrompt?: string; // AI Edit Prompt (e.g. "Add fire effect")
}

export interface PosterTemplate {
  id: string;
  name: string;
  bgGradient: string; // CSS Gradient
  accentColor: string; // Main highlight color (e.g., text, badges)
  swooshColor1: string; // Top right graphic color
  swooshColor2: string; // Bottom left graphic color
  textColor: string; // Main text color
}

export interface AppState {
  step: 'IMPORT' | 'REVIEW' | 'IMAGES' | 'GALLERY';
  currentMonthData: StudentData[];
  lastMonthData: Map<string, number>; // Map<Name+Campus, Attendance>
  selectedWinners: Winner[];
  selectedTemplateId: string;
  isAddModalOpen: boolean; // Control manual add modal
  periodLabel: string; // e.g. "2025年1月"
  customBackground?: string; // User uploaded reference style
}