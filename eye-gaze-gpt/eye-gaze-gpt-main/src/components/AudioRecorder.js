import { useState, useEffect, useRef, useCallback } from 'react';

const AudioRecorder = ({ onAudioReady, recordingEnabled, setLastRecordedText }) => {
    const [recording, setRecording] = useState(false);
    const [audioChunks, setAudioChunks] = useState([]);
    const mediaRecorder = useRef(null);
    const recordingTimeout = useRef(null);
    const audioStream = useRef(null);

    const sendAudio = useCallback(() => {
        if (audioChunks.length === 0) return;
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
            const base64data = reader.result;
            onAudioReady(base64data); // Call the function provided by the parent component
            clearAudioChunks(); // Clear chunks after sending
        };
    }, [audioChunks, onAudioReady]);

    useEffect(() => {
        const startRecording = () => {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    audioStream.current = stream;
                    setRecording(true);
                    const mediaRecorderInstance = new MediaRecorder(stream);
                    mediaRecorder.current = mediaRecorderInstance;

                    mediaRecorderInstance.ondataavailable = e => {
                        if (e.data.size > 0) {
                            setAudioChunks(prevChunks => [...prevChunks, e.data]);
                        }
                    };

                    mediaRecorderInstance.start();

                    recordingTimeout.current = setTimeout(() => {
                        stopRecording(true); // true indicates it should restart after stopping
                    }, 30000); // Stop after 30 seconds
                })
                .catch(error => {
                    console.error('Error accessing microphone:', error);
                });
        };

        const stopRecording = (restart = false) => {
            if (mediaRecorder.current) {
                mediaRecorder.current.stop();
                mediaRecorder.current.onstop = () => {
                    clearTimeout(recordingTimeout.current);
                    setRecording(false);

                    if (audioStream.current) {
                        audioStream.current.getTracks().forEach(track => track.stop());
                        audioStream.current = null;
                    }

                    if (restart && recordingEnabled) {
                        startRecording(); // Restart recording after stopping
                    }
                };
            }
        };

        if (recordingEnabled && !recording) {
            startRecording();
        } else if (!recordingEnabled && recording) {
            stopRecording();
        }

        return () => {
            if (mediaRecorder.current) {
                mediaRecorder.current.onstop = null;
                clearTimeout(recordingTimeout.current);
            }
        };
    }, [recordingEnabled, recording]);

    useEffect(() => {
        if (!recording && audioChunks.length > 0) {
            sendAudio();
        }
    }, [recording, audioChunks, sendAudio]);

    const clearAudioChunks = () => {
        setAudioChunks([]);
    };

    return null; // No UI elements needed here
};

export default AudioRecorder;
