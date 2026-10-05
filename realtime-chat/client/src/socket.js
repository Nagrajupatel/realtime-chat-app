import { io } from 'socket.io-client';
import { API_URL } from './api.js';

let socket;

export function connectSocket() {
  socket = io(API_URL, { auth: { token: localStorage.getItem('token') } });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
