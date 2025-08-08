"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Play, Pause, Upload, Trash2 } from 'lucide-react';

interface AudioInputComponentProps {
    onAudioSubmit: (audioBlob: Blob) => void;
    isSubmitting?: boolean;
    maxDuration?: number;
    className?: string;
}

export const AudioInputComponent: React.FC<AudioInputComponentProps> = ({
    onAudioSubmit,
    isSubmitting = false,
    maxDuration = 60,
    className = ""
}) => {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const audioElementRef = useRef<HTMLAudioElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
            }
            if (audioElementRef.current) {
                audioElementRef.current.pause();
                audioElementRef.current = null;
            }
        };
    }, []);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            });

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(audioBlob);
                
                // Stop all tracks to release microphone
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            // Start recording timer
            recordingIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => {
                    const newTime = prev + 1;
                    // Auto-stop at max duration
                    if (newTime >= maxDuration) {
                        stopRecording();
                        return maxDuration;
                    }
                    return newTime;
                });
            }, 1000);

        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Could not access microphone. Please check your permissions.');
        }
    }, [maxDuration]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
                recordingIntervalRef.current = null;
            }
        }
    }, [isRecording]);

    const playAudio = useCallback(() => {
        if (audioBlob && !isPlaying) {
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audioElementRef.current = audio;

            audio.addEventListener('loadedmetadata', () => {
                setDuration(audio.duration);
            });

            audio.addEventListener('timeupdate', () => {
                setCurrentTime(audio.currentTime);
            });

            audio.addEventListener('ended', () => {
                setIsPlaying(false);
                setCurrentTime(0);
                audioElementRef.current = null;
            });

            audio.play();
            setIsPlaying(true);
        }
    }, [audioBlob, isPlaying]);

    const pauseAudio = useCallback(() => {
        if (audioElementRef.current && isPlaying) {
            audioElementRef.current.pause();
            setIsPlaying(false);
        }
    }, [isPlaying]);

    const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type.startsWith('audio/')) {
            setAudioBlob(file);
            setRecordingTime(0);
        }
    }, []);

    const handleSubmit = useCallback(() => {
        if (audioBlob) {
            onAudioSubmit(audioBlob);
        }
    }, [audioBlob, onAudioSubmit]);

    const handleReset = useCallback(() => {
        setAudioBlob(null);
        setRecordingTime(0);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        
        if (audioElementRef.current) {
            audioElementRef.current.pause();
            audioElementRef.current = null;
        }
    }, []);

    const handleDeleteClick = () => {
        setShowDeleteConfirmation(true);
    };

    const confirmDelete = () => {
        // Stop playback if it's playing
        if (isPlaying && audioElementRef.current) {
            audioElementRef.current.pause();
            setIsPlaying(false);
        }

        // Reset all audio-related states
        setAudioBlob(null);
        setRecordingTime(0);
        setCurrentTime(0);
        setDuration(0);
        setShowDeleteConfirmation(false);

        // Clear audio player source if it exists
        if (audioElementRef.current) {
            audioElementRef.current.src = '';
        }
    };

    const cancelDelete = () => {
        setShowDeleteConfirmation(false);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
            <h3 className="text-lg font-semibold mb-4">Record Your Response</h3>
            
            {/* Recording Controls */}
            <div className="flex flex-col items-center space-y-4">
                {!audioBlob && (
                    <div className="flex items-center space-x-4">
                        {!isRecording ? (
                            <button
                                onClick={startRecording}
                                disabled={isSubmitting}
                                className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-colors disabled:cursor-not-allowed ${
                                    isSubmitting
                                        ? 'bg-gray-600 text-white'
                                        : 'bg-red-600 text-white hover:bg-red-700'
                                }`}
                            >
                                <Mic className="h-5 w-5" />
                                <span>Start Recording</span>
                            </button>
                        ) : (
                            <button
                                onClick={stopRecording}
                                className="flex items-center space-x-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                            >
                                <Square className="h-5 w-5" />
                                <span>Stop Recording</span>
                            </button>
                        )}
                        
                        <div className="text-center">
                            <div className="text-sm text-gray-600">or</div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="audio/*"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isSubmitting || isRecording}
                                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Upload className="h-4 w-4" />
                                <span>Upload Audio</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Recording Timer */}
                {isRecording && (
                    <div className="text-center">
                        <div className="text-2xl font-mono text-red-600 mb-2">
                            {formatTime(recordingTime)}
                        </div>
                        <div className="text-sm text-gray-600">
                            Max: {formatTime(maxDuration)}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div
                                className="bg-red-600 h-2 rounded-full transition-all duration-1000"
                                style={{ width: `${(recordingTime / maxDuration) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Audio Playback */}
                {audioBlob && (
                    <div className="w-full max-w-md">
                        <div className="flex items-center space-x-4 mb-4">
                            <button
                                onClick={isPlaying ? pauseAudio : playAudio}
                                disabled={isSubmitting}
                                className={`flex items-center justify-center w-12 h-12 rounded-full transition-colors disabled:cursor-not-allowed ${
                                    isSubmitting
                                        ? 'bg-gray-600 text-white'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                            >
                                {isPlaying ? (
                                    <Pause className="h-6 w-6" />
                                ) : (
                                    <Play className="h-6 w-6" />
                                )}
                            </button>
                            
                            <div className="flex-1">
                                <div className="text-sm text-gray-600 mb-1">
                                    {formatTime(currentTime)} / {formatTime(duration || recordingTime)}
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ 
                                            width: `${duration ? (currentTime / duration) * 100 : 0}%` 
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex space-x-3">
                            <button
                                onClick={handleReset}
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Record Again
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className={`flex-1 px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed ${
                                    isSubmitting
                                        ? 'bg-gray-600 text-white'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Delete button and confirmation dialog */}
                {audioBlob && (
                    <div className="flex flex-col items-center space-y-2">
                        <button
                            onClick={handleDeleteClick}
                            disabled={isSubmitting}
                            className={`px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed ${
                                isSubmitting ? 'bg-gray-600 text-white' : 'bg-red-600 text-white hover:bg-red-700'
                            }`}
                        >
                            <Trash2 className="h-5 w-5 mr-2 inline-block" />
                            Delete Recording
                        </button>

                        {showDeleteConfirmation && (
                            <div className="flex flex-col items-center space-y-2">
                                <p className="text-sm text-gray-600">
                                    Are you sure you want to delete this recording?
                                </p>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={cancelDelete}
                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmDelete}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                    >
                                        Confirm Delete
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AudioInputComponent;