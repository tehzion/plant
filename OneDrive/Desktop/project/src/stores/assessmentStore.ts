import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { handleSupabaseError } from '../lib/supabaseError';
import { Assessment, AssessmentSection, AssessmentQuestion, QuestionOption } from '../types';

interface AssessmentState {
  assessments: Assessment[];
  currentAssessment: Assessment | null;
  isLoading: boolean;
  error: string | null;
  fetchAssessments: (organizationId?: string) => Promise<void>;
  fetchAssessment: (id: string) => Promise<void>;
  createAssessment: (data: Omit<Assessment, 'id' | 'sections' | 'createdAt' | 'updatedAt'>) => Promise<string | undefined>;
  updateAssessment: (id: string, data: Partial<Omit<Assessment, 'sections'>>) => Promise<void>;
  deleteAssessment: (id: string) => Promise<void>;
  addSection: (assessmentId: string, section: Omit<AssessmentSection, 'id' | 'questions'>) => Promise<void>;
  updateSection: (assessmentId: string, sectionId: string, data: Partial<Omit<AssessmentSection, 'questions'>>) => Promise<void>;
  deleteSection: (assessmentId: string, sectionId: string) => Promise<void>;
  addQuestion: (assessmentId: string, sectionId: string, question: Omit<AssessmentQuestion, 'id'>) => Promise<void>;
  updateQuestion: (assessmentId: string, sectionId: string, questionId: string, data: Partial<AssessmentQuestion>) => Promise<void>;
  deleteQuestion: (assessmentId: string, sectionId: string, questionId: string) => Promise<void>;
  assignUsers: (assessmentId: string, employeeIds: string[], reviewerIds: string[]) => Promise<void>;
  assignOrganizations: (assessmentId: string, organizationIds: string[]) => Promise<void>;
}

export const useAssessmentStore = create<AssessmentState>((set, get) => ({
  assessments: [],
  currentAssessment: null,
  isLoading: false,
  error: null,

  fetchAssessments: async (organizationId?: string) => {
    set({ isLoading: true, error: null });
    try {
      let query = supabase
        .from('assessments')
        .select(`
          *,
          sections:assessment_sections(
            *,
            questions:assessment_questions(
              *,
              options:question_options(*)
            )
          ),
          assignedOrganizations:assessment_organization_assignments(
            organization:organizations(*)
          )
        `);

      if (organizationId) {
        query = query.or(`organization_id.eq.${organizationId},is_default.eq.true`);
      }

      const { data: assessments, error } = await query;

      if (error) throw error;

      const formattedAssessments = assessments?.map(assessment => ({
        ...assessment,
        sections: assessment.sections || [],
        assignedOrganizations: assessment.assignedOrganizations?.map(
          (assignment: any) => assignment.organization
        ) || [],
        isDefault: assessment.is_default,
        organizationEmail: assessment.organization_email
      }));

      set({ assessments: formattedAssessments || [], isLoading: false, error: null });
    } catch (error) {
      set({ error: handleSupabaseError(error), isLoading: false });
    }
  },

  fetchAssessment: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: assessment, error } = await supabase
        .from('assessments')
        .select(`
          *,
          sections:assessment_sections(
            *,
            questions:assessment_questions(
              *,
              options:question_options(*)
            )
          ),
          assignedOrganizations:assessment_organization_assignments(
            organization:organizations(*)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      const formattedAssessment = {
        ...assessment,
        sections: assessment.sections || [],
        assignedOrganizations: assessment.assignedOrganizations?.map(
          (assignment: any) => assignment.organization
        ) || []
      };

      set({ currentAssessment: formattedAssessment, isLoading: false, error: null });
    } catch (error) {
      set({ error: handleSupabaseError(error), isLoading: false });
    }
  },

  createAssessment: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const { data: assessment, error } = await supabase
        .from('assessments')
        .insert([{
          title: data.title,
          description: data.description,
          organization_id: data.organizationId,
          created_by_id: data.createdById,
          is_default: data.isDefault || false,
          organization_email: data.organizationEmail || null
        }])
        .select()
        .single();

      if (error) throw error;

      const newAssessment = {
        ...assessment,
        sections: [],
        assignedOrganizations: [],
        isDefault: assessment.is_default,
        organizationEmail: assessment.organization_email
      };

      set(state => ({
        assessments: [newAssessment, ...state.assessments],
        isLoading: false,
        error: null
      }));

      return assessment.id;
    } catch (error) {
      set({ error: handleSupabaseError(error), isLoading: false });
      return undefined;
    }
  },

  updateAssessment: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('assessments')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        assessments: state.assessments.map(assessment =>
          assessment.id === id ? { ...assessment, ...data } : assessment
        ),
        currentAssessment: state.currentAssessment?.id === id
          ? { ...state.currentAssessment, ...data }
          : state.currentAssessment,
        isLoading: false,
        error: null
      }));
    } catch (error) {
      set({ error: handleSupabaseError(error), isLoading: false });
    }
  },

  deleteAssessment: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('assessments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        assessments: state.assessments.filter(a => a.id !== id),
        currentAssessment: state.currentAssessment?.id === id ? null : state.currentAssessment,
        isLoading: false,
        error: null
      }));
    } catch (error) {
      set({ error: handleSupabaseError(error), isLoading: false });
    }
  },

  addSection: async (assessmentId, section) => {
    set({ isLoading: true, error: null });
    try {
      const { data: newSection, error } = await supabase
        .from('assessment_sections')
        .insert([{ ...section, assessment_id: assessmentId }])
        .select()
        .single();

      if (error) throw error;

      const formattedSection = {
        ...newSection,
        questions: []
      };

      const { currentAssessment } = get();
      if (!currentAssessment) throw new Error('No current assessment loaded');

      set({
        currentAssessment: {
          ...currentAssessment,
          sections: [...currentAssessment.sections, formattedSection],
        },
        isLoading: false,
        error: null
      });
    } catch (error) {
      set({ error: handleSupabaseError(error), isLoading: false });
    }
  },

  updateSection: async (assessmentId, sectionId, data) => {
    set({ isLoading: true, error: null });
    try {
      const { data: updatedSection, error } = await supabase
        .from('assessment_sections')
        .update(data)
        .eq('id', sectionId)
        .single();

      if (error) throw error;

      const { currentAssessment } = get();
      if (!currentAssessment) throw new Error('No current assessment loaded');

      const updatedSections = currentAssessment.sections.map(s =>
        s.id === sectionId ? { ...s, ...updatedSection } : s
      );

      set({
        currentAssessment: { ...currentAssessment, sections: updatedSections },
        isLoading: false,
        error: null
      });
    } catch (error) {
      set({ error: handleSupabaseError(error), isLoading: false });
    }
  },

  deleteSection: async (assessmentId, sectionId) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('assessment_sections')
        .delete()
        .eq('id', sectionId);

      if (error) throw error;

      const { currentAssessment } = get();
      if (!currentAssessment) throw new Error('No current assessment loaded');

      set({
        currentAssessment: {
          ...currentAssessment,
          sections: currentAssessment.sections.filter(s => s.id !== sectionId),
        },
        isLoading: false,
        error: null
      });
    } catch (error) {
      set({ error: handleSupabaseError(error), isLoading: false });
    }
  },

  addQuestion: async (assessmentId, sectionId, question) => {
    set({ isLoading: true, error: null });
    try {
      const { data: newQuestion, error } = await supabase
        .from('assessment_questions')
        .insert([{ ...question, section_id: sectionId }])
        .select()
        .single();

      if (error) throw error;

      const formattedQuestion = {
        ...newQuestion,
        options: []
      };

      const { currentAssessment } = get();
      if (!currentAssessment) throw new Error('No current assessment loaded');

      const updatedSections = currentAssessment.sections.map(s => {
        if (s.id === sectionId) {
          return {
            ...s,
            questions: [...s.questions, formattedQuestion]
          };
        }
        return s;
      });

      set({
        currentAssessment: { ...currentAssessment, sections: updatedSections },
        isLoading: false,
        error: null
      });
    } catch (error) {
      set({ error: handleSupabaseError(error), isLoading: false });
    }
  },

  updateQuestion: async (assessmentId, sectionId, questionId, data) => {
    set({ isLoading: true, error: null });
    try {
      const { data: updatedQuestion, error } = await supabase
        .from('assessment_questions')
        .update(data)
        .eq('id', questionId)
        .single();

      if (error) throw error;

      const { currentAssessment } = get();
      if (!currentAssessment) throw new Error('No current assessment loaded');

      const updatedSections = currentAssessment.sections.map(s => {
        if (s.id === sectionId) {
          return {
            ...s,
            questions: s.questions.map(q =>
              q.id === questionId ? { ...q, ...updatedQuestion } : q
            )
          };
        }
        return s;
      });

      set({
        currentAssessment: { ...currentAssessment, sections: updatedSections },
        isLoading: false,
        error: null
      });
    } catch (error) {
      set({ error: handleSupabaseError(error), isLoading: false });
    }
  },

  deleteQuestion: async (assessmentId, sectionId, questionId) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('assessment_questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;

      const { currentAssessment } = get();
      if (!currentAssessment) throw new Error('No current assessment loaded');

      const updatedSections = currentAssessment.sections.map(s => {
        if (s.id === sectionId) {
          return {
            ...s,
            questions: s.questions.filter(q => q.id !== questionId)
          };
        }
        return s;
      });

      set({
        currentAssessment: { ...currentAssessment, sections: updatedSections },
        isLoading: false,
        error: null
      });
    } catch (error) {
      set({ error: handleSupabaseError(error), isLoading: false });
    }
  },

  assignUsers: async (assessmentId, employeeIds, reviewerIds) => {
    set({ isLoading: true, error: null });
    try {
      // Clear existing assignments first
      await supabase.from('assessment_user_assignments').delete().eq('assessment_id', assessmentId);

      // Insert new assignments
      const assignments = [
        ...employeeIds.map(id => ({ assessment_id: assessmentId, user_id: id, role: 'employee' })),
        ...reviewerIds.map(id => ({ assessment_id: assessmentId, user_id: id, role: 'reviewer' })),
      ];

      if (assignments.length > 0) {
        const { error } = await supabase.from('assessment_user_assignments').insert(assignments);
        if (error) throw error;
      }

      set({ isLoading: false, error: null });
    } catch (error) {
      set({ error: handleSupabaseError(error), isLoading: false });
    }
  },

  assignOrganizations: async (assessmentId, organizationIds) => {
    set({ isLoading: true, error: null });
    try {
      // Clear existing organization assignments
      await supabase.from('assessment_organization_assignments').delete().eq('assessment_id', assessmentId);

      // Insert new organization assignments
      const assignments = organizationIds.map(orgId => ({
        assessment_id: assessmentId,
        organization_id: orgId,
      }));

      if (assignments.length > 0) {
        const { error } = await supabase.from('assessment_organization_assignments').insert(assignments);
        if (error) throw error;
      }

      // Refresh assessment data
      await get().fetchAssessment(assessmentId);

      set({ isLoading: false, error: null });
    } catch (error) {
      set({ error: handleSupabaseError(error), isLoading: false });
    }
  },
}));