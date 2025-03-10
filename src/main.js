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
    GiPerspectiveDiceSixFacesRandom,
    CoSpeech,
    MdCategory,
    FaEdit,
    FaQuestion,
    FaCheck,
    FaTimes,
    MdFibernew,
    MdAutofixhigh,
    RiShareBoxFill
} from "oh-vue-icons/icons";
import './style.css'
import App from './App.vue'
import { router } from './router'
import socketPlugin from "@/plugins/socket-plugin";
import {registerSW} from "virtual:pwa-register";

const pinia = createPinia();
addIcons(HiInformationCircle, BiArrowDownUp, FaAngleDoubleUp, FaDownload, MdReplaycirclefilled, MdDeleteforever,
    HiClipboardCopy, GiPerspectiveDiceSixFacesRandom, CoSpeech, MdCategory, FaEdit, FaQuestion, FaCheck, FaTimes,
    MdFibernew, MdAutofixhigh, RiShareBoxFill);

pinia.use(({ store }) => {
    store.$router = markRaw(router);
});
createApp(App)
    .use(router)
    .use(pinia)
    .use(socketPlugin)
    .mount('#app')

const updateSW = registerSW({
    onNeedRefresh() {
        if (confirm("New content is available!. Refresh to update?")) {
            updateSW().then(_ => {});
            // TODO: Add a pleasant toast notification for this
        }
    },
    onOfflineReady() {
    }
})