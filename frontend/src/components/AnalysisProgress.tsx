import React from 'react';
import { Search, Lightbulb, Layers } from 'lucide-react';
import { AnalysisState } from '../types/research';

interface AnalysisProgressProps {
  state: AnalysisState;
  topic: string;
}

const AnalysisProgress: React.FC<AnalysisProgressProps> = ({ state, topic }) => {
  const steps = [
    {
      id: 'analyzing',
      icon: Search,
      label: 'Finding papers',
      description: 'Searching academic databases',
    },
    {
      id: 'building-graph',
      icon: Layers,
      label: 'Building knowledge graph',
      description: 'Mapping connections and relationships',
    },
    {
      id: 'generating-insights',
      icon: Lightbulb,
      label: 'Generating insights',
      description: 'AI analysis and synthesis',
    },
  ];

  const currentStepIndex = steps.findIndex((step) => step.id === state);

  return (
    <div className="min-h-[calc(100dvh-5rem)] sm:min-h-[80vh] flex items-center justify-center px-4 sm:px-6 py-8">
      <div className="w-full max-w-2xl mx-auto text-center animate-fade-in">
        <div className="mb-8 sm:mb-12">
          <h1 className="text-lg sm:text-2xl font-semibold text-gray-800 mb-2">
            Analyzing research landscape for
          </h1>
          <h2 className="text-xl sm:text-3xl font-bold text-blue-600 mb-4 sm:mb-6 break-words px-2">
            &quot;{topic}&quot;
          </h2>
          <p className="text-sm sm:text-base text-gray-600">This usually takes 30–60 seconds</p>
        </div>

        <div className="space-y-3 sm:space-y-6 mb-8 sm:mb-12">
          {steps.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;
            const IconComponent = step.icon;

            return (
              <div
                key={step.id}
                className={`flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 rounded-xl transition-all duration-500 text-left ${
                  isActive
                    ? 'bg-blue-50 border-2 border-blue-200 sm:scale-105'
                    : isCompleted
                      ? 'bg-green-50 border-2 border-green-200'
                      : 'bg-gray-50 border-2 border-gray-200'
                }`}
              >
                <div
                  className={`p-2 sm:p-3 rounded-full shrink-0 ${
                    isActive
                      ? 'bg-blue-500 animate-pulse'
                      : isCompleted
                        ? 'bg-green-500'
                        : 'bg-gray-400'
                  }`}
                >
                  <IconComponent className="text-white w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3
                    className={`font-semibold text-sm sm:text-base ${
                      isActive
                        ? 'text-blue-700'
                        : isCompleted
                          ? 'text-green-700'
                          : 'text-gray-600'
                    }`}
                  >
                    {step.label}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                    {step.description}
                  </p>
                </div>
                {isActive && (
                  <div className="ml-auto shrink-0">
                    <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-blue-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AnalysisProgress;
