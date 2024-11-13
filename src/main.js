import { createApp, markRaw } from 'vue'
import { createPinia } from "pinia";
import { addIcons } from "oh-vue-icons";
import {
    HiInformationCircle,
    BiArrowDownUp,
    FaAngleDoubleUp,
    FaDownload,
    MdReplaycirclefilled,
    MdDeleteforever,
    HiClipboardCopy,
    GiPerspectiveDiceSixFacesRandom
} from "oh-vue-icons/icons";
import './style.css'
import App from './App.vue'
import { router } from './router'
import socketPlugin from "@/plugins/socket-plugin";

const pinia = createPinia();
addIcons(HiInformationCircle, BiArrowDownUp, FaAngleDoubleUp, FaDownload, MdReplaycirclefilled, MdDeleteforever,
    HiClipboardCopy, GiPerspectiveDiceSixFacesRandom);

pinia.use(({ store }) => {
    store.$router = markRaw(router);
});
createApp(App)
    .use(router)
    .use(pinia)
    .use(socketPlugin)
    .mount('#app')
