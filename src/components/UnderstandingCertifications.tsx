// src/components/UnderstandingCertification.tsx

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Star, CheckCircle, Brain } from 'lucide-react';
import confetti from 'canvas-confetti';

interface UnderstandingCertificationProps {
    certification: {
        certified: boolean;
        certification_message: string;
        mastery_level: 'basic' | 'proficient' | 'advanced';
        concepts_mastered: string[];
    };
    onComplete: () => void;
}

const UnderstandingCertification: React.FC<UnderstandingCertificationProps> = ({
    certification,
    onComplete
}) => {
    const [showAnimation, setShowAnimation] = useState(true);

    useEffect(() => {
        if (certification.certified) {
            // Trigger confetti animation
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b']
            });

            // Auto-hide after celebration
            const timer = setTimeout(() => {
                setShowAnimation(false);
                onComplete();
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [certification.certified, onComplete]);

    if (!certification.certified) return null;

    const masteryInfo = {
        basic: { 
            label: 'Basic Understanding', 
            color: 'bg-green-100 text-green-800',
            icon: CheckCircle,
            description: 'You grasp the fundamental concepts!'
        },
        proficient: { 
            label: 'Proficient Understanding', 
            color: 'bg-blue-100 text-blue-800',
            icon: Star,
            description: 'You demonstrate solid comprehension!'
        },
        advanced: { 
            label: 'Advanced Understanding', 
            color: 'bg-purple-100 text-purple-800',
            icon: Brain,
            description: 'You show exceptional mastery!'
        }
    };

    const info = masteryInfo[certification.mastery_level];
    const IconComponent = info.icon;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 max-w-lg w-full animate-bounce-in">
                <CardContent className="p-6 text-center space-y-4">
                    <div className="flex justify-center">
                        <div className="relative">
                            <Award className="h-16 w-16 text-yellow-500 animate-pulse" />
                            <div className="absolute inset-0 animate-ping">
                                <Award className="h-16 w-16 text-yellow-300 opacity-75" />
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-green-800">
                            🎉 Understanding Certified! 🎉
                        </h2>
                        <p className="text-gray-700">{certification.certification_message}</p>
                    </div>

                    <div className="flex justify-center">
                        <Badge className={`${info.color} px-4 py-2 text-sm font-semibold`}>
                            <IconComponent className="h-4 w-4 mr-2" />
                            {info.label}
                        </Badge>
                    </div>

                    <p className="text-green-700 font-medium">{info.description}</p>

                    {certification.concepts_mastered.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">
                                Concepts Mastered:
                            </p>
                            <div className="flex flex-wrap gap-2 justify-center">
                                {certification.concepts_mastered.map((concept, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                        {concept}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="pt-4">
                        <button
                            onClick={() => {
                                setShowAnimation(false);
                                onComplete();
                            }}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            Continue Learning
                        </button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default UnderstandingCertification;