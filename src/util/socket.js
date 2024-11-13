import { io } from 'socket.io-client';

export class NavigatorSocket {
    isSocketConnected = false;
    constructor() {
        console.log("Creating new socket connection to Navigator Realtime Server");
        const that = this;
        this.socket = io(import.meta.env.VITE_RT_API_BASE);
        this.on('connect', () => {
            console.log("Connected to Navigator Realtime Server");
            that.isSocketConnected = true;
        });
        this.on('disconnect', () => {
            console.log("Disconnected from Navigator Realtime Server");
            that.isSocketConnected = false;
        });
    }

    on(event, callback) {
        this.socket.on(event, callback);
    }

    off(event, callback) {
        this.socket.off(event, callback);
    }

    emit(event, data) {
        this.socket.emit(event, data);
    }
}