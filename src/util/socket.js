import { io } from 'socket.io-client';

export class NavigatorSocket {
  constructor() {
      console.log("Creating new socket connection to Navigator Realtime Server");
      this.socket = io(import.meta.env.VITE_RT_API_BASE);
      this.on('connect', () => {
          console.log("Connected to Navigator Realtime Server");
      });
  }

  on(event, callback) {
    this.socket.on(event, callback);
  }

  deregister(event, callback) {
    this.socket.off(event, callback);
  }

  emit(event, data) {
    this.socket.emit(event, data);
  }
}