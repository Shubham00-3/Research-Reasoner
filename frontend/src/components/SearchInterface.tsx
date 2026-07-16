import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface SearchInterfaceProps {
  onSearch: (topic: string) => void;
}

const SearchInterface: React.FC<SearchInterfaceProps> = ({ onSearch }) => {
  const [topic, setTopic] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      onSearch(topic.trim());
    }
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] sm:min-h-[80vh] flex items-center justify-center px-4 sm:px-6 py-8">
      <div className="w-full max-w-2xl mx-auto text-center animate-fade-in">
        <form onSubmit={handleSubmit} className="mb-5 sm:mb-6">
          <div className="relative group">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter a research topic..."
              className="w-full px-4 sm:px-6 py-3.5 sm:py-4 text-base sm:text-lg border-2 border-gray-200 rounded-xl sm:rounded-2xl bg-white/80 backdrop-blur-sm shadow-lg focus:border-blue-500 focus:outline-none focus:shadow-xl transition-all duration-300 pr-12 sm:pr-14"
              autoFocus
              enterKeyHint="search"
            />
            <button
              type="submit"
              disabled={!topic.trim()}
              aria-label="Search"
              className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 touch-target flex items-center justify-center"
            >
              <Search size={20} />
            </button>
          </div>
        </form>

        <p className="text-base sm:text-xl text-gray-600 mb-6 sm:mb-8 font-light">
          AI-Powered Research Discovery
        </p>

        <div className="space-y-3">
          <p className="text-sm text-gray-500 mb-3 sm:mb-4">Try these topics:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              'Quantum Computing',
              'CRISPR Gene Editing',
              'Renewable Energy Storage',
              'Artificial Neural Networks',
              'Climate Change Mitigation',
            ].map((sampleTopic) => (
              <button
                key={sampleTopic}
                type="button"
                onClick={() => setTopic(sampleTopic)}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-white/60 backdrop-blur-sm border border-gray-200 rounded-full hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 min-h-[40px]"
              >
                {sampleTopic}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchInterface;
