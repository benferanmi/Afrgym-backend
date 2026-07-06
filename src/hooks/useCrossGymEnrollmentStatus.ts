import { useState, useEffect, useCallback } from 'react';
import { useCheckinCacheStore, FingerprintEnrollment } from '@/stores/checkinCacheStore';

export function useCrossGymEnrollmentStatus(userId: number | undefined) {
  const { fingerprints, checkCrossGymEnrollment } = useCheckinCacheStore();
  const [crossGymEnrollment, setCrossGymEnrollment] = useState<FingerprintEnrollment | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchEnrollment = useCallback(async () => {
    if (!userId) {
      setCrossGymEnrollment(null);
      return;
    }

    setLoading(true);

    try {
      // 1. Check local cache first
      const local = fingerprints.find((f) => f.user_id === userId && f.is_active);
      if (local) {
        setCrossGymEnrollment(local);
        return;
      }

      // 2. Fetch cross-gym
      const result = await checkCrossGymEnrollment(userId);
      setCrossGymEnrollment(result);
    } catch (err) {
      console.error("Failed to check cross-gym enrollment:", err);
      setCrossGymEnrollment(null);
    } finally {
      setLoading(false);
    }
  }, [userId, fingerprints, checkCrossGymEnrollment]);

  useEffect(() => {
    let isMounted = true;

    if (!userId) {
      setCrossGymEnrollment(null);
      return;
    }

    setLoading(true);

    // Run the check asynchronously
    const runCheck = async () => {
      try {
        const local = fingerprints.find((f) => f.user_id === userId && f.is_active);
        if (local) {
          if (isMounted) setCrossGymEnrollment(local);
          return;
        }

        const result = await checkCrossGymEnrollment(userId);
        if (isMounted) setCrossGymEnrollment(result);
      } catch (err) {
        console.error("Failed to check cross-gym enrollment:", err);
        if (isMounted) setCrossGymEnrollment(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    runCheck();

    return () => {
      isMounted = false;
    };
  }, [userId, fingerprints, checkCrossGymEnrollment]);

  return { crossGymEnrollment, loading, setCrossGymEnrollment, refreshEnrollment: fetchEnrollment };
}
