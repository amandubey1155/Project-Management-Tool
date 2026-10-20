import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const activeProjectRef = useRef(null);

  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    // Connect to backend (proxied through /socket.io in Vite or direct to port 5000)
    const newSocket = io({
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      setConnected(true);
      // Re-join project room if was previously inside one
      if (activeProjectRef.current) {
        newSocket.emit('project:join', { projectId: activeProjectRef.current });
      }
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  const joinProject = (projectId) => {
    activeProjectRef.current = projectId;
    if (socket && connected) {
      socket.emit('project:join', { projectId });
    }
  };

  const leaveProject = (projectId) => {
    if (activeProjectRef.current === projectId) {
      activeProjectRef.current = null;
    }
    if (socket && connected) {
      socket.emit('project:leave', { projectId });
    }
  };

  return (
    <SocketContext.Provider value={{ socket, connected, joinProject, leaveProject }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within a SocketProvider');
  return ctx;
}
