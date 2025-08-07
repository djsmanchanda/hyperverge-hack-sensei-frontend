import React, { useState } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface TranscriptHighlight {
    start: number;
    end: number;
    text: string;
    type: string;
    severity: string;
}

interface TranscriptViewerProps {
    transcript: string;
    highlights?: TranscriptHighlight[];
    audioBlob?: Blob | null;
}

export const TranscriptViewer: React.FC<TranscriptViewerProps> = ({ 
    transcript, 
    highlights = [], 
    audioBlob 
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

    const handlePlayPause = () => {
        if (audioBlob && !audioElement) {
            const audio = new Audio(URL.createObjectURL(audioBlob));
            audio.addEventListener('timeupdate', () => {
                setCurrentTime(audio.currentTime);
            });
            audio.addEventListener('ended', () => {
                setIsPlaying(false);
            });
            setAudioElement(audio);
            audio.play();
            setIsPlaying(true);
        } else if (audioElement) {
            if (isPlaying) {
                audioElement.pause();
                setIsPlaying(false);
            } else {
                audioElement.play();
                setIsPlaying(true);
            }
        }
    };

    const highlightText = (text: string) => {
        if (!highlights.length) return text;

        let highlightedText = text;
        highlights.forEach((highlight, index) => {
            const className = highlight.severity === 'warning' 
                ? 'bg-yellow-200 text-yellow-800 px-1 rounded'
                : 'bg-red-200 text-red-800 px-1 rounded';
            
            highlightedText = highlightedText.replace(
                new RegExp(`(${highlight.text})`, 'gi'),
                `<span class="${className}" title="${highlight.type}">$1</span>`
            );
        });

        return highlightedText;
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Transcript</h3>
                {audioBlob && (
                    <button
                        onClick={handlePlayPause}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        {isPlaying ? (
                            <Pause className="h-4 w-4" />
                        ) : (
                            <Play className="h-4 w-4" />
                        )}
                        <span>{isPlaying ? 'Pause' : 'Play'} Audio</span>
                        <Volume2 className="h-4 w-4" />
                    </button>
                )}
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
                {transcript ? (
                    <div 
                        className="text-gray-800 leading-relaxed text-sm md:text-base"
                        dangerouslySetInnerHTML={{ 
                            __html: highlightText(transcript) 
                        }}
                    />
                ) : (
                    <p className="text-gray-500 italic">No transcript available.</p>
                )}
            </div>

            {highlights.length > 0 && (
                <div className="mt-4">
                    <h4 className="font-semibold text-gray-700 mb-2">Legend:</h4>
                    <div className="flex flex-wrap gap-2 text-xs">
                        <div className="flex items-center space-x-1">
                            <div className="w-3 h-3 bg-yellow-200 rounded"></div>
                            <span>Areas for improvement</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <div className="w-3 h-3 bg-red-200 rounded"></div>
                            <span>Issues to address</span>
                        </div>
                    </div>
                </div>
            )}

            {audioElement && (
                <div className="mt-4">
                    <div className="text-xs text-gray-500">
                        Audio position: {Math.floor(currentTime)}s
                    </div>
                </div>
            )}
        </div>
    );
};

export default TranscriptViewer;