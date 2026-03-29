import { AppState, AppStateStatus } from 'react-native';
import { API_BASE_URL } from '../API/API';

const PING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutos

let intervalId: ReturnType<typeof setInterval> | null = null;
let appStateSubscription: any = null;

const ping = async () => {
  try {
    await fetch(`${API_BASE_URL}/api/update-app`, {
      method: 'GET',
      signal: AbortSignal.timeout(8000),
    });
  } catch (_) {
    // Silencioso — solo es un keep-alive
  }
};

const startPinging = () => {
  if (intervalId) return;
  intervalId = setInterval(ping, PING_INTERVAL_MS);
};

const stopPinging = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
};

const handleAppStateChange = (nextState: AppStateStatus) => {
  if (nextState === 'active') {
    startPinging();
  } else {
    stopPinging();
  }
};

export const initServerKeepAlive = () => {
  // Ping inmediato al abrir la app para despertar el servidor cuanto antes
  ping();

  // Arrancar el intervalo si la app ya está activa
  if (AppState.currentState === 'active') {
    startPinging();
  }

  // Escuchar cambios de estado (foreground / background)
  appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
};

export const destroyServerKeepAlive = () => {
  stopPinging();
  appStateSubscription?.remove();
  appStateSubscription = null;
};
