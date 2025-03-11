import { createRouter, createWebHistory } from 'vue-router'

import HomeView from "./pages/HomeView.vue";
import {useAuthStore} from "@/stores/auth";
import {useAlertStore} from "@/stores/alerts";
import GalleryView from "@/pages/GalleryView.vue";
import GenerateView from "@/pages/GenerateView.vue";
import SettingsView from "@/pages/SettingsView.vue";
import ModelBrowserPage from "@/pages/ModelBrowserPage.vue";

const routes = [
    { path: '/', component: HomeView },
    { path: '/gallery', component: GalleryView, meta:{ requiresAuth: true } },
    { path: '/generate/txt2img', component: GenerateView, meta:{ requiresAuth: true }, name: 'txt2img' },
    { path: '/generate/img2img', component: GenerateView, meta:{ requiresAuth: true }, name: 'img2img' },
    { path: '/settings', component: SettingsView, meta:{ requiresAuth: true }, name: 'settings'},
    { path: '/model-browser', component: ModelBrowserPage, meta:{ requiresAuth: true }, name: 'model-browser' }
];

export const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
});

router.beforeEach((to, from, next) => {
    console.log("Navigating to: ", to);
    const authStore = useAuthStore();
    const alertStore = useAlertStore();
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
    if(!to.matched.length) {
        console.log("No route found, redirecting to /");
        alertStore.addAlert("That page does not exist.", "error");
        next("/");
        return;
    }
    if(requiresAuth && !authStore.isLoggedIn()) {
        console.log("User is not logged in, redirecting to /");
        alertStore.addAlert("You must be logged in to access that page.", "error");
        next("/");
    } else {
        next();
    }
});