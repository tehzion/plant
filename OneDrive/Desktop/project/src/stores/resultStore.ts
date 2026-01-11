import { create } from 'zustand';
import { AssessmentResult } from '../types';

interface ResultState {
  results: Record<string, AssessmentResult[]>; // employeeId -> results
  isLoading: boolean;
  error: string | null;
  fetchResults: (employeeId: string) => Promise<void>;
  exportResults: (format: 'csv' | 'pdf') => Promise<string>;
}

// Mock data
const mockResults: Record<string, AssessmentResult[]> = {
  '2': [
    {
      sectionId: '1',
      sectionTitle: 'Communication Skills',
      questions: [
        {
          id: '1',
          text: 'How well does the individual communicate complex ideas?',
          selfRating: 4,
          avgReviewerRating: 3.5,
          gap: 0.5,
          alignment: 'overestimated',
          comments: ['Good communicator but sometimes too technical']
        },
        {
          id: '2',
          text: 'How effective is their written communication?',
          selfRating: 3,
          avgReviewerRating: 4,
          gap: -1,
          alignment: 'underestimated',
          comments: ['Written communication is quite strong']
        }
      ],
      selfAverage: 3.5,
      reviewerAverage: 3.75,
      overallGap: -0.25,
      overallAlignment: 'aligned'
    },
    {
      sectionId: '2',
      sectionTitle: 'Decision Making',
      questions: [
        {
          id: '3',
          text: 'How well does the individual analyze problems?',
          selfRating: 4,
          avgReviewerRating: 4,
          gap: 0,
          alignment: 'aligned',
          comments: ['Very analytical and thorough']
        },
        {
          id: '4',
          text: 'Does the individual make timely decisions?',
          selfRating: 5,
          avgReviewerRating: 3,
          gap: 2,
          alignment: 'overestimated',
          comments: ['Sometimes takes too long to decide', 'Can be indecisive at times']
        }
      ],
      selfAverage: 4.5,
      reviewerAverage: 3.5,
      overallGap: 1,
      overallAlignment: 'overestimated'
    }
  ]
};

export const useResultStore = create<ResultState>((set) => ({
  results: {},
  isLoading: false,
  error: null,
  
  fetchResults: async (employeeId: string) => {
    set({ isLoading: true, error: null });
    try {
      // This would be an API call in a real implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const employeeResults = mockResults[employeeId] || [];
      
      set(state => ({ 
        results: { 
          ...state.results, 
          [employeeId]: employeeResults 
        }, 
        isLoading: false 
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
  
  exportResults: async (format: 'csv' | 'pdf') => {
    set({ isLoading: true, error: null });
    try {
      // This would be an API call in a real implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock response - in a real implementation this would return a URL
      const downloadUrl = `https://example.com/results.${format}`;
      
      set({ isLoading: false });
      return downloadUrl;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      return '';
    }
  }
}));