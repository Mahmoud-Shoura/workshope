import React, { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useVoiceRecognition } from '../../hooks/useVoiceRecognition';
import { parseVoiceMeasurements } from '../../lib/parseVoiceMeasurements';
import './VoiceInput.css';

export function VoiceInput({ onMeasurementsDetected, rowId }) {
    const [error, setError] = useState('');
    const [showTooltip, setShowTooltip] = useState(false);

    const handleResult = (transcript) => {
        const measurements = parseVoiceMeasurements(transcript);

        if (measurements) {
            onMeasurementsDetected(measurements);
            setError('');
        } else {
            setError('لم يتم التعرف على المقاسات. حاول مرة أخرى');
            setTimeout(() => setError(''), 3000);
        }
    };

    const handleError = (errorMessage) => {
        setError(errorMessage);
        setTimeout(() => setError(''), 3000);
    };

    const { isListening, isSupported, startListening, stopListening } = useVoiceRecognition(
        handleResult,
        handleError
    );

    if (!isSupported) {
        return null; // أو يمكن إظهار رسالة أن الميزة غير مدعومة
    }

    const handleClick = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    return (
        <div className="voice-input-container">
            <button
                className={`voice-input-button ${isListening ? 'listening' : ''}`}
                onClick={handleClick}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                title="تسجيل صوتي"
                type="button"
            >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                {isListening && (
                    <span className="voice-input-pulse"></span>
                )}
            </button>

            {error && (
                <div className="voice-input-error">
                    {error}
                </div>
            )}

            {showTooltip && !isListening && (
                <div className="voice-input-tooltip">
                    قل: "50 في 60 تلت حتت"
                </div>
            )}
        </div>
    );
}
