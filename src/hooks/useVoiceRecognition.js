import { useState, useEffect, useRef } from 'react';

/**
 * Hook للتعامل مع Web Speech API
 * @param {Function} onResult - callback عند الحصول على نتيجة
 * @param {Function} onError - callback عند حدوث خطأ
 */
export function useVoiceRecognition(onResult, onError) {
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const recognitionRef = useRef(null);

    useEffect(() => {
        // التحقق من دعم المتصفح
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition) {
            setIsSupported(true);
            recognitionRef.current = new SpeechRecognition();

            // إعدادات التعرف على الصوت
            recognitionRef.current.lang = 'ar-EG'; // اللغة العربية
            recognitionRef.current.continuous = false; // إيقاف بعد جملة واحدة
            recognitionRef.current.interimResults = false; // النتائج النهائية فقط
            recognitionRef.current.maxAlternatives = 1;

            // عند الحصول على نتيجة
            recognitionRef.current.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                console.log('Voice transcript:', transcript);
                if (onResult) {
                    onResult(transcript);
                }
                setIsListening(false);
            };

            // عند انتهاء التسجيل
            recognitionRef.current.onend = () => {
                setIsListening(false);
            };

            // عند حدوث خطأ
            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                let errorMessage = 'حدث خطأ في التعرف على الصوت';

                switch (event.error) {
                    case 'no-speech':
                        errorMessage = 'لم يتم اكتشاف صوت. حاول مرة أخرى';
                        break;
                    case 'audio-capture':
                        errorMessage = 'لا يمكن الوصول إلى الميكروفون';
                        break;
                    case 'not-allowed':
                        errorMessage = 'الإذن للوصول إلى الميكروفون مرفوض';
                        break;
                    case 'network':
                        errorMessage = 'خطأ في الاتصال بالإنترنت';
                        break;
                }

                if (onError) {
                    onError(errorMessage);
                }
                setIsListening(false);
            };
        } else {
            setIsSupported(false);
        }

        // Cleanup
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, [onResult, onError]);

    /**
     * بدء التسجيل الصوتي
     */
    const startListening = () => {
        if (!isSupported) {
            if (onError) {
                onError('المتصفح لا يدعم التعرف على الصوت. استخدم Chrome أو Edge');
            }
            return;
        }

        if (recognitionRef.current && !isListening) {
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch (error) {
                console.error('Error starting recognition:', error);
                if (onError) {
                    onError('خطأ في بدء التسجيل');
                }
            }
        }
    };

    /**
     * إيقاف التسجيل الصوتي
     */
    const stopListening = () => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    };

    return {
        isListening,
        isSupported,
        startListening,
        stopListening
    };
}
