import {NavigatorSocket} from "@/util/socket";

export default {
    install: (app) => {
        const navigator_socket = new NavigatorSocket();
        app.config.globalProperties.$navigator_rt = navigator_socket;
        app.provide("$navigator_rt", navigator_socket);
    }
}