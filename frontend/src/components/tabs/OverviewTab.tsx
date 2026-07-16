
import React from 'react';
import { ArrowDown } from 'lucide-react';
import { ResultsData } from '../../types/research';

interface OverviewTabProps {
  data: ResultsData;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ data }) => {
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'High': return 'text-red-600 bg-red-50 border-red-200';
      case 'Medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      {/* Summary Section */}
      <div className="mb-6 sm:mb-8">
        <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-3 sm:mb-4">
          Research Summary
        </h3>
        <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
          {data.summary}
        </p>
      </div>

      {/* Key Findings */}
      <div className="mb-6 sm:mb-8">
        <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4 sm:mb-6">
          Key Findings
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {data.keyFindings.map((finding, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-all duration-300 sm:hover:scale-105"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-800">
                  {finding.title}
                </h4>
                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getImpactColor(finding.impact)}`}>
                  {finding.impact}
                </span>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                {finding.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Knowledge Graph Preview */}
      <div className="mb-8">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">
          Knowledge Graph Preview
        </h3>
        <div className="border border-gray-200 rounded-xl p-8 bg-gradient-to-br from-blue-50 to-purple-50 text-center">
          <div className="mb-4">
            <div className="inline-flex items-center space-x-2 text-gray-600">
              <div className="w-8 h-8 bg-blue-500 rounded-full"></div>
              <div className="w-4 h-0.5 bg-gray-400"></div>
              <div className="w-6 h-6 bg-green-500 rounded-full"></div>
              <div className="w-4 h-0.5 bg-gray-400"></div>
              <div className="w-8 h-8 bg-purple-500 rounded-full"></div>
            </div>
          </div>
          <p className="text-gray-600 mb-4">
            Interactive knowledge graph showing {data.connectionsDiscovered} connections
          </p>
          <p className="text-sm text-gray-500">
            Switch to "Knowledge Map" tab for full interactive view
          </p>
        </div>
      </div>

      {/* Next Steps */}
      <div className="text-center">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">
          Next Steps
        </h3>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <button className="px-5 sm:px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all duration-200 sm:hover:scale-105 flex items-center justify-center space-x-2 min-h-[48px] text-sm sm:text-base">
            <span>Explore Detailed Insights</span>
            <ArrowDown size={18} />
          </button>
          <button className="px-5 sm:px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 sm:hover:scale-105 min-h-[48px] text-sm sm:text-base">
            Generate Research Draft
          </button>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
