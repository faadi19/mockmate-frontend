import { useState, useEffect, useRef, useCallback } from 'react';
import { loadFaceApiModels, verifyFace } from '../utils/faceVerification';

interface UseFaceVerificationConfig {
    enabled: boolean;
    videoElement: HTMLVideoElement | null;
    checkIntervalMs?: number;
    pauseIdentityCheck?: boolean; // New param to skip id check
}

export type VerificationStatus = 'SUCCESS' | 'NO_FACE' | 'WRONG_FACE' | 'MULTI_FACE' | 'CAMERA_OFF' | 'ERROR';

declare const faceapi: any;

export function useFaceVerification({
    enabled,
    videoElement,
    checkIntervalMs = 2000,
    pauseIdentityCheck = false,
}: UseFaceVerificationConfig) {
    const [isModelsLoaded, setIsModelsLoaded] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [mismatchCount, setMismatchCount] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isVerified, setIsVerified] = useState(false);
    const [multipleFacesDetected, setMultipleFacesDetected] = useState(false);
    const [noFaceDetected, setNoFaceDetected] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [isWrongFaceDetected, setIsWrongFaceDetected] = useState(false);

    const lastCheckTimeRef = useRef<number>(0);
    const isInitializingRef = useRef(false);

    // Load models on mount
    useEffect(() => {
        if (isInitializingRef.current) return;
        isInitializingRef.current = true;

        const init = async () => {
            const success = await loadFaceApiModels();
            if (success) {
                setIsModelsLoaded(true);
            } else {
                setError('Failed to load face verification models');
            }
        };
        init();
    }, []);

    /**
     * Perform a single verification check
     * Returns a VerificationStatus
     */
    const performVerification = useCallback(async (): Promise<VerificationStatus> => {
        if (!isModelsLoaded || isVerifying || typeof faceapi === 'undefined') return 'ERROR';

        // Check for camera status (Rule 1 & 4)
        if (!videoElement || videoElement.readyState < 2) {
            setIsCameraOff(true);
            setIsVerified(false);
            return 'CAMERA_OFF';
        }

        const stream = videoElement.srcObject as MediaStream;
        if (stream) {
            const tracks = stream.getVideoTracks();
            if (tracks.length === 0 || tracks.some(t => !t.enabled || t.muted || t.readyState === 'ended')) {
                setIsCameraOff(true);
                setIsVerified(false);
                return 'CAMERA_OFF';
            }
        } else {
            // No stream object
            setIsCameraOff(true);
            setIsVerified(false);
            return 'CAMERA_OFF';
        }

        setIsCameraOff(false);

        try {
            setIsVerifying(true);

            // Detect ALL faces to handle multiple persons in frame
            const detections = await faceapi
                .detectAllFaces(videoElement)
                .withFaceLandmarks()
                .withFaceDescriptors();

            if (detections.length === 0) {
                setIsVerified(false);
                setMultipleFacesDetected(false);
                setNoFaceDetected(true);
                setIsWrongFaceDetected(false);
                return 'NO_FACE';
            }

            if (detections.length > 1) {
                setMultipleFacesDetected(true);
                setNoFaceDetected(false);
                setIsVerified(false);
                setIsWrongFaceDetected(false);
                return 'MULTI_FACE';
            }

            // Single face detected - proceed with verification
            setMultipleFacesDetected(false);
            setNoFaceDetected(false);

            // CHANGED: If paused (e.g. user distracted/looking away), skip identity check
            // This prevents "Identity Mismatch" errors when user turns head.
            if (pauseIdentityCheck) {
                // We consider it "verified" in the sense that we don't block them.
                // We reset mismatch count or keep it as is? 
                // Resetting helps prevent immediate termination on return if they were at limit.
                setIsVerified(true);
                setIsWrongFaceDetected(false);
                return 'SUCCESS'; // Or 'PAUSED' if we had that status, but SUCCESS works to keep flow going
            }

            const embedding = detections[0].descriptor;
            const result = await verifyFace(embedding);

            if (result.verified) {
                setMismatchCount(0);
                setIsVerified(true);
                setIsWrongFaceDetected(false);
                return 'SUCCESS';
            } else {
                setMismatchCount((prev) => prev + 1);
                setIsVerified(false);
                setIsWrongFaceDetected(true);
                return 'WRONG_FACE';
            }
        } catch (err: any) {
            console.error('Face verification error:', err);
            return 'ERROR';
        } finally {
            setIsVerifying(false);
        }
    }, [videoElement, isModelsLoaded, isVerifying, pauseIdentityCheck]);

    // Continuous verification loop
    useEffect(() => {
        if (!enabled || !isModelsLoaded || !videoElement) return;

        const interval = setInterval(() => {
            const now = Date.now();
            if (now - lastCheckTimeRef.current >= checkIntervalMs) {
                lastCheckTimeRef.current = now;
                performVerification();
            }
        }, 500);

        return () => clearInterval(interval);
    }, [enabled, isModelsLoaded, videoElement, checkIntervalMs, performVerification]);

    return {
        isModelsLoaded,
        isVerifying,
        mismatchCount,
        error,
        isVerified,
        multipleFacesDetected,
        noFaceDetected,
        isCameraOff,
        isWrongFaceDetected,
        performVerification,
        setMismatchCount,
    };
}
