import React from 'react';
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface CriterionScore {
    criterion: string;
    score: number;
    feedback: string;
    transcript_references: string[];
}

interface RubricScorecardProps {
    scores: CriterionScore[];
}

export const RubricScorecard: React.FC<RubricScorecardProps> = ({ scores }) => {
    const getScoreColor = (score: number) => {
        if (score >= 4) return 'text-green-600 bg-green-50 border-green-200';
        if (score >= 3) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        return 'text-red-600 bg-red-50 border-red-200';
    };

    const getScoreIcon = (score: number) => {
        if (score >= 4) return <CheckCircle className="h-5 w-5 text-green-500" />;
        if (score >= 3) return <AlertCircle className="h-5 w-5 text-yellow-500" />;
        return <XCircle className="h-5 w-5 text-red-500" />;
    };

    const getCriterionLabel = (criterion: string) => {
        switch (criterion.toLowerCase()) {
            case 'content': return 'Content Quality';
            case 'structure': return 'Organization & Structure';
            case 'clarity': return 'Clarity & Communication';
            case 'delivery': return 'Delivery & Confidence';
            default: return criterion.charAt(0).toUpperCase() + criterion.slice(1);
        }
    };

    if (!scores || scores.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold mb-4">Rubric Evaluation</h3>
                <p className="text-gray-500">No evaluation scores available.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold mb-4">Detailed Rubric Scores</h3>
            
            <div className="space-y-4">
                {scores.map((score, index) => (
                    <div key={index} className={`border rounded-lg p-4 ${getScoreColor(score.score)}`}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                                {getScoreIcon(score.score)}
                                <h4 className="font-semibold text-lg">
                                    {getCriterionLabel(score.criterion)}
                                </h4>
                            </div>
                            <div className="text-2xl font-bold">
                                {score.score}/5
                            </div>
                        </div>
                        
                        <p className="text-gray-700 mb-3 leading-relaxed">
                            {score.feedback}
                        </p>
                        
                        {score.transcript_references && score.transcript_references.length > 0 && (
                            <div className="mt-3">
                                <h5 className="text-sm font-semibold text-gray-600 mb-2">
                                    Referenced in transcript:
                                </h5>
                                <div className="space-y-1">
                                    {score.transcript_references.map((reference, refIndex) => (
                                        <div key={refIndex} className="bg-white bg-opacity-70 p-2 rounded text-sm italic border-l-3 border-gray-300">
                                            "{reference}"
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            
            {/* Score Legend */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h5 className="font-semibold text-gray-700 mb-2">Score Guide:</h5>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs">
                    <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-red-500 rounded"></div>
                        <span>1 - Poor</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-orange-500 rounded"></div>
                        <span>2 - Fair</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                        <span>3 - Good</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-blue-500 rounded"></div>
                        <span>4 - Very Good</span>
                    </div>
                    <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-green-500 rounded"></div>
                        <span>5 - Excellent</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RubricScorecard;