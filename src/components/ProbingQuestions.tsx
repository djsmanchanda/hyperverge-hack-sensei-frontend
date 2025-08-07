// src/components/ProbingQuestion.tsx

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, CheckCircle, Award } from 'lucide-react';

interface ProbingQuestionProps {
    question: string;
    questionType: 'explanation' | 'modification' | 'alternative' | 'prediction';
    onResponse: (response: string) => void;
    isLoading?: boolean;
}

const ProbingQuestion: React.FC<ProbingQuestionProps> = ({
    question,
    questionType,
    onResponse,
    isLoading = false
}) => {
    const [response, setResponse] = useState('');

    const questionTypeInfo = {
        explanation: { label: 'Explain', icon: '💡', color: 'bg-blue-100 text-blue-800' },
        modification: { label: 'What If', icon: '🔄', color: 'bg-purple-100 text-purple-800' },
        alternative: { label: 'Alternative', icon: '🔀', color: 'bg-green-100 text-green-800' },
        prediction: { label: 'Predict', icon: '🔮', color: 'bg-orange-100 text-orange-800' }
    };

    const typeInfo = questionTypeInfo[questionType];

    const handleSubmit = () => {
        if (response.trim()) {
            onResponse(response.trim());
        }
    };

    return (
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-blue-600" />
                        <CardTitle className="text-lg text-blue-800">Probe Me Challenge</CardTitle>
                    </div>
                    <Badge className={typeInfo.color}>
                        <span className="mr-1">{typeInfo.icon}</span>
                        {typeInfo.label}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="bg-white p-4 rounded-lg border-l-4 border-blue-400">
                    <p className="text-gray-800 leading-relaxed">{question}</p>
                </div>
                
                <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700">
                        Your explanation:
                    </label>
                    <textarea
                        value={response}
                        onChange={(e) => setResponse(e.target.value)}
                        placeholder="Explain your understanding in detail..."
                        className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={4}
                        disabled={isLoading}
                    />
                    
                    <Button 
                        onClick={handleSubmit}
                        disabled={!response.trim() || isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                        {isLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Evaluating Understanding...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Submit Explanation
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default ProbingQuestion;