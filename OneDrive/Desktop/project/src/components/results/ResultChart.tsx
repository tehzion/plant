import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { AssessmentResult } from '../../types';
import { AlertCircle, TrendingDown, TrendingUp, CheckCircle } from 'lucide-react';

interface ResultChartProps {
  result: AssessmentResult;
}

const ResultChart: React.FC<ResultChartProps> = ({ result }) => {
  const data = result.questions.map(q => ({
    name: q.text.length > 30 ? q.text.substring(0, 30) + '...' : q.text,
    Self: q.selfRating,
    'Reviewer Avg': q.avgReviewerRating,
    Gap: q.gap
  }));
  
  const getAlignmentIcon = (alignment: string) => {
    switch (alignment) {
      case 'aligned':
        return <CheckCircle className="h-4 w-4 text-success-600" />;
      case 'overestimated':
        return <TrendingDown className="h-4 w-4 text-warning-600" />;
      case 'underestimated':
        return <TrendingUp className="h-4 w-4 text-primary-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };
  
  const getAlignmentBadge = (alignment: string) => {
    switch (alignment) {
      case 'aligned':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
          <CheckCircle className="h-3 w-3 mr-1" /> Aligned
        </span>;
      case 'overestimated':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-800">
          <TrendingDown className="h-3 w-3 mr-1" /> Overestimated
        </span>;
      case 'underestimated':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
          <TrendingUp className="h-3 w-3 mr-1" /> Underestimated
        </span>;
      default:
        return null;
    }
  };
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const question = result.questions.find(q => 
        q.text.startsWith(label.split('...')[0])
      );
      
      return (
        <div className="bg-white p-4 shadow-lg rounded-lg border border-gray-200">
          <p className="font-medium mb-2">{question?.text}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-primary-600">Self Rating:</span> {payload[0].value}
            </p>
            <p className="text-sm">
              <span className="text-secondary-600">Reviewer Average:</span> {payload[1].value}
            </p>
            {question && (
              <>
                <div className="border-t border-gray-200 my-2" />
                <div className="flex items-center">
                  <span className="text-sm mr-2">Alignment:</span>
                  {getAlignmentBadge(question.alignment)}
                </div>
                {question.comments.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium mb-1">Reviewer Comments:</p>
                    <ul className="text-sm text-gray-600 list-disc list-inside">
                      {question.comments.map((comment, idx) => (
                        <li key={idx} className="truncate">{comment}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{result.sectionTitle}</h3>
          <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
            <span>Self Average: {result.selfAverage.toFixed(1)}</span>
            <span>•</span>
            <span>Reviewer Average: {result.reviewerAverage.toFixed(1)}</span>
            <span>•</span>
            <span>Gap: {result.overallGap > 0 ? '+' : ''}{result.overallGap.toFixed(1)}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Overall:</span>
          {getAlignmentBadge(result.overallAlignment)}
        </div>
      </div>
      
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{
              top: 20,
              right: 30,
              left: 40,
              bottom: 10,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              type="number" 
              domain={[0, 5]} 
              ticks={[1, 2, 3, 4, 5]}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={150} 
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <ReferenceLine x={3} stroke="#CBD5E1" strokeDasharray="3 3" />
            <Bar 
              dataKey="Self" 
              fill="#3B82F6" 
              radius={[0, 4, 4, 0]}
            />
            <Bar 
              dataKey="Reviewer Avg" 
              fill="#7E22CE" 
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-6 space-y-4">
        {result.questions.map(q => (
          <div key={q.id} className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  {getAlignmentIcon(q.alignment)}
                  <span className="font-medium">{q.text}</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Self Rating:</span>
                    <span className="ml-1 font-medium text-primary-700">{q.selfRating}/5</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Reviewer Avg:</span>
                    <span className="ml-1 font-medium text-secondary-700">{q.avgReviewerRating}/5</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Gap:</span>
                    <span className={`ml-1 font-medium ${
                      q.gap > 0 ? 'text-warning-600' : 
                      q.gap < 0 ? 'text-primary-600' : 
                      'text-success-600'
                    }`}>
                      {q.gap > 0 ? '+' : ''}{q.gap}
                    </span>
                  </div>
                </div>
              </div>
              <div className="ml-4">
                {getAlignmentBadge(q.alignment)}
              </div>
            </div>
            {q.comments.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Reviewer Comments:</p>
                <ul className="space-y-1">
                  {q.comments.map((comment, idx) => (
                    <li key={idx} className="text-sm text-gray-600 flex items-start">
                      <span className="mr-2">•</span>
                      <span>{comment}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResultChart;