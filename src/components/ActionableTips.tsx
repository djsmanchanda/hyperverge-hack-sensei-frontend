import React from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface ActionableTip {
    title: string;
    description: string;
    transcript_lines: string[];
    timestamp_ranges: Array<{start: number; end: number; word: string}>;
    priority: number;
}

interface ActionableTipsProps {
    tips: ActionableTip[];
}

export const ActionableTips: React.FC<ActionableTipsProps> = ({ tips }) => {
    const getPriorityIcon = (priority: number) => {
        switch (priority) {
            case 1:
                return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
            case 2:
                return <InformationCircleIcon className="h-5 w-5 text-yellow-500" />;
            case 3:
                return <CheckCircleIcon className="h-5 w-5 text-blue-500" />;
            default:
                return <InformationCircleIcon className="h-5 w-5 text-gray-500" />;
        }
    };

    const getPriorityLabel = (priority: number) => {
        switch (priority) {
            case 1:
                return "High Priority";
            case 2:
                return "Medium Priority";
            case 3:
                return "Low Priority";
            default:
                return "Priority";
        }
    };

    const getPriorityBg = (priority: number) => {
        switch (priority) {
            case 1:
                return "bg-red-50 border-red-200";
            case 2:
                return "bg-yellow-50 border-yellow-200";
            case 3:
                return "bg-blue-50 border-blue-200";
            default:
                return "bg-gray-50 border-gray-200";
        }
    };

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    if (!tips.length) {
        return (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center">
                    <CheckCircleIcon className="h-6 w-6 text-green-500 mr-2" />
                    <h3 className="text-lg font-semibold text-green-800">Excellent Response!</h3>
                </div>
                <p className="text-green-700 mt-2">
                    Your response demonstrates strong performance across all criteria. Keep up the great work!
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center">
                <InformationCircleIcon className="h-6 w-6 text-blue-500 mr-2" />
                Actionable Tips for Improvement
            </h3>
            
            <div className="space-y-4">
                {tips.map((tip, index) => (
                    <div 
                        key={index}
                        className={`border rounded-lg p-4 ${getPriorityBg(tip.priority)}`}
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center">
                                {getPriorityIcon(tip.priority)}
                                <h4 className="font-semibold ml-2">{tip.title}</h4>
                            </div>
                            <span className="text-xs font-medium px-2 py-1 rounded-full bg-white bg-opacity-70">
                                {getPriorityLabel(tip.priority)}
                            </span>
                        </div>
                        
                        <p className="text-gray-700 mb-3">{tip.description}</p>
                        
                        {/* Transcript References */}
                        {tip.transcript_lines.length > 0 && (
                            <div className="mt-3">
                                <h5 className="text-sm font-semibold text-gray-600 mb-2">Transcript Examples:</h5>
                                <div className="space-y-1">
                                    {tip.transcript_lines.map((line, lineIndex) => (
                                        <div key={lineIndex} className="bg-white bg-opacity-70 p-2 rounded text-sm italic border-l-3 border-gray-300">
                                            "{line}"
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Timestamp References */}
                        {tip.timestamp_ranges.length > 0 && (
                            <div className="mt-3">
                                <h5 className="text-sm font-semibold text-gray-600 mb-2">Specific Moments:</h5>
                                <div className="flex flex-wrap gap-2">
                                    {tip.timestamp_ranges.map((range, rangeIndex) => (
                                        <span 
                                            key={rangeIndex}
                                            className="inline-flex items-center px-2 py-1 bg-white bg-opacity-70 rounded text-xs"
                                        >
                                            <span className="font-mono text-gray-600">
                                                {formatTime(range.start)}
                                            </span>
                                            <span className="mx-1 text-gray-400">→</span>
                                            <span className="font-semibold">"{range.word}"</span>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ActionableTips;