import React,{ useEffect } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../API/API';

const socket = io(`${API_BASE_URL}`); // usa tu dominio o IP

function DriverUpdates() {
  useEffect(() => {
    socket.on('driverPositionUpdate', (data) => {
      console.log('Nueva posición de driver:', data);
    });

    return () => {
      socket.off('driverPositionUpdate');
    };
  }, []);

  return <div>Esperando actualizaciones...</div>;
}

export default DriverUpdates;
