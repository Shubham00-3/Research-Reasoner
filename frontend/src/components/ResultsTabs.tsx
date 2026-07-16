import React, { useState } from 'react';
import { Share2, MessageCircle, FileText } from 'lucide-react';
import OverviewTab from './tabs/OverviewTab';
import KnowledgeMapTab from './tabs/KnowledgeMapTab';
import ChatTab from './tabs/ChatTab';
import { ResultsData } from '../types/research';
import ResearchPaperGenerator from './ResearchPaperGenerator';

interface ResultsTabsProps {
  data: ResultsData;
  topic: string;
}

const ResultsTabs: React.FC<ResultsTabsProps> = ({ data, topic }) => {
  const [activeTab, setActiveTab] = useState('knowledge-map');

  const tabs = [
    {
      id: 'knowledge-map',
      label: 'Knowledge Map',
      shortLabel: 'Map',
      icon: Share2,
      component: KnowledgeMapTab,
    },
    {
      id: 'chat',
      label: 'Research Assistant',
      shortLabel: 'Chat',
      icon: MessageCircle,
      component: ChatTab,
    },
    {
      id: 'paper-generator',
      label: 'Generate Paper',
      shortLabel: 'Paper',
      icon: FileText,
      component: ResearchPaperGenerator,
    },
  ];

  const ActiveComponent =
    tabs.find((tab) => tab.id === activeTab)?.component || OverviewTab;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden w-full">
      {/* Topic strip */}
      <div className="px-3 sm:px-6 pt-4 sm:pt-5 pb-2 border-b border-gray-100 bg-gray-50/80">
        <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 truncate" title={topic}>
          {topic}
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
          {data.papersFound} papers
          <span className="hidden sm:inline"> · {data.connectionsDiscovered} connections</span>
          <span className="hidden md:inline"> · {data.authorsAnalyzed} authors</span>
        </p>
      </div>

      {/* Tab Navigation — horizontal scroll on small screens */}
      <div className="border-b border-gray-200 bg-gray-50 overflow-x-auto overscroll-x-contain">
        <nav className="flex min-w-max sm:min-w-0" role="tablist">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-3 sm:py-4 font-medium text-xs sm:text-sm transition-all duration-200 whitespace-nowrap min-h-[48px] ${
                  isActive
                    ? 'text-blue-600 bg-white border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                <Icon size={16} className="sm:w-[18px] sm:h-[18px] shrink-0" />
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content — flexible height on mobile */}
      <div className="min-h-[50vh] sm:min-h-[560px] md:min-h-[600px]">
        <ActiveComponent data={data} topic={topic} />
      </div>
    </div>
  );
};

export default ResultsTabs;
