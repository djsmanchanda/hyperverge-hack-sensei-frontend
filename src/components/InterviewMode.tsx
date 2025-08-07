import React, { useState, useCallback } from 'react';
import AudioInputComponent from './AudioInputComponent'; // Changed to default import
import TranscriptViewer from './TranscriptViewer'; // Changed to default import
import RubricScorecard from './RubricScorecard'; // Changed to default import
import ActionableTips from './ActionableTips'; // Changed to default import

interface InterviewEvaluation {
    scores: Array<{
        criterion: string;
        score: number;
        feedback: string;
        transcript_references: string[];
    }>;
    overall_score: number;
    actionable_tips: Array<{
        title: string;
        description: string;
        transcript_lines: string[];
        timestamp_ranges: Array<{start: number; end: number; word: string}>;
        priority: number;
    }>;
    transcript: string;
    speech_analysis: {
        word_count: number;
        filler_count: number;
        speaking_rate_wpm: number;
        total_duration: number;
        long_pauses: Array<any>;
    };
    duration_seconds: number;
}

interface InterviewModeProps {
    question: string;
    maxDuration?: number;
    onComplete?: (evaluation: InterviewEvaluation) => void;
}

export const InterviewMode: React.FC<InterviewModeProps> = ({
    question,
    maxDuration = 60,
    onComplete
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [evaluation, setEvaluation] = useState<InterviewEvaluation | null>(null);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

    const handleAudioSubmit = useCallback(async (blob: Blob) => {
        setIsSubmitting(true);
        setAudioBlob(blob);

        try {
            // First upload the audio file
            const formData = new FormData();
            formData.append('file', blob, 'interview_response.wav');
            formData.append('content_type', 'audio/wav');

            const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/file/upload-local`, {
                method: 'POST',
                body: formData
            });

            if (!uploadResponse.ok) {
                throw new Error('Failed to upload audio file');
            }

            const { file_uuid } = await uploadResponse.json();

            // Then evaluate the interview response
            const evaluationResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/ai/interview/evaluate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    audio_uuid: file_uuid,
                    question: question,
                    max_duration: maxDuration
                })
            });

            if (!evaluationResponse.ok) {
                throw new Error('Failed to evaluate interview response');
            }

            const result = await evaluationResponse.json();
            setEvaluation(result);
            
            if (onComplete) {
                onComplete(result);
            }
        } catch (error) {
            console.error('Error evaluating interview:', error);
        } finally {
            setIsSubmitting(false);
        }
    }, [question, maxDuration, onComplete]);

    return (
        <div className="interview-mode max-w-4xl mx-auto p-6">
            {/* Question Display */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Interview Question</h3>
                <p className="text-blue-800">{question}</p>
                <p className="text-sm text-blue-600 mt-2">
                    Target time: {maxDuration} seconds
                </p>
            </div>

            {/* Audio Input */}
            {!evaluation && (
                <div className="mb-6">
                    <AudioInputComponent
                        onAudioSubmit={handleAudioSubmit}
                        isSubmitting={isSubmitting}
                        maxDuration={maxDuration}
                    />
                    {isSubmitting && (
                        <div className="mt-4 text-center">
                            <div className="inline-flex items-center px-4 py-2 bg-blue-100 rounded-lg">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                <span className="text-blue-700">Transcribing and evaluating your response...</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Results Display */}
            {evaluation && (
                <div className="space-y-6">
                    {/* Overall Score */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold">Overall Score</h3>
                            <div className="text-3xl font-bold text-blue-600">
                                {evaluation.overall_score.toFixed(1)}/5.0
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                                <div className="text-sm text-gray-600">Duration</div>
                                <div className="font-semibold">
                                    {evaluation.duration_seconds.toFixed(1)}s
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-sm text-gray-600">Speaking Rate</div>
                                <div className="font-semibold">
                                    {evaluation.speech_analysis.speaking_rate_wpm.toFixed(0)} WPM
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-sm text-gray-600">Word Count</div>
                                <div className="font-semibold">
                                    {evaluation.speech_analysis.word_count}
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-sm text-gray-600">Fillers</div>
                                <div className="font-semibold">
                                    {evaluation.speech_analysis.filler_count}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actionable Tips */}
                    <ActionableTips tips={evaluation.actionable_tips} />

                    {/* Detailed Rubric Scores */}
                    <RubricScorecard scores={evaluation.scores} />

                    {/* Transcript */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-xl font-bold mb-4">Transcript</h3>
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-gray-800 leading-relaxed">
                                {evaluation.transcript}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InterviewMode;