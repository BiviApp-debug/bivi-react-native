import { useEffect, useRef, useState } from 'react';

export const useOnlineTimer = () => {
  const [secondsOnline, setSecondsOnline] = useState(0);

  // 👇 TIPADO CORRECTO
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsOnline((prev) => prev + 1);
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const hours = Math.floor(secondsOnline / 3600);
  const minutes = Math.floor((secondsOnline % 3600) / 60);
  const seconds = secondsOnline % 60;

  return {
    secondsOnline,
    formattedTime: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
  };
};
