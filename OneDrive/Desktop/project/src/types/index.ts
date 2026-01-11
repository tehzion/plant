export type Role = 'super_admin' | 'org_admin' | 'employee' | 'reviewer';

export type QuestionType = 'rating' | 'multiple_choice' | 'yes_no' | 'text';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  notificationsEnabled?: boolean;
}

export interface Organization {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionOption {
  id: string;
  questionId: string;
  text: string;
  value?: number;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentQuestion {
  id: string;
  text: string;
  order: number;
  questionType: QuestionType;
  scaleMax?: number;
  isRequired: boolean;
  options?: QuestionOption[];
}

export interface AssessmentSection {
  id: string;
  title: string;
  description: string;
  order: number;
  questions: AssessmentQuestion[];
}

export interface Assessment {
  id: string;
  title: string;
  description: string;
  organizationId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  sections: AssessmentSection[];
  assignedOrganizations?: Organization[];
  isDefault?: boolean;
  organizationEmail?: string;
}

export interface AssessmentProgress {
  id: string;
  assignmentId: string;
  sectionId: string;
  completedQuestions: number;
  totalQuestions: number;
  isCompleted: boolean;
  lastUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentAssignment {
  id: string;
  assessmentId: string;
  employeeId: string;
  reviewerId: string;
  status: 'pending' | 'in_progress' | 'completed';
  dueDate: string;
  progress?: AssessmentProgress[];
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentResponse {
  id: string;
  assignmentId: string;
  questionId: string;
  rating?: number;
  textResponse?: string;
  selectedOptionId?: string;
  comment?: string;
  respondentId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentResult {
  sectionId: string;
  sectionTitle: string;
  questions: {
    id: string;
    text: string;
    selfRating: number;
    avgReviewerRating: number;
    gap: number;
    alignment: 'aligned' | 'overestimated' | 'underestimated';
    comments: string[];
  }[];
  selfAverage: number;
  reviewerAverage: number;
  overallGap: number;
  overallAlignment: 'aligned' | 'overestimated' | 'underestimated';
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  organizationName: string;
}