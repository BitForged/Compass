import { createRouter, createWebHistory } from 'vue-router'

import HomeView from "./pages/HomeView.vue";
import {useAuthStore} from "@/stores/auth";
import {useAlertStore} from "@/stores/alerts";
import GalleryView from "@/pages/GalleryView.vue";
import GenerateView from "@/pages/GenerateView.vue";

const routes = [
    { path: '/', component: HomeView },
    { path: '/gallery', component: GalleryView, meta:{ requiresAuth: true } },
    { path: '/generate', component: GenerateView, meta:{ requiresAuth: true } },
];

export const router = createRouter({
    history: createWebHistory(),
    routes,
});

router.beforeEach((to, from, next) => {
    console.log("Navigating to: ", to);
    const authStore = useAuthStore();
    const alertStore = useAlertStore();
    const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
    if(!to.matched.length > 0) {
        console.log("No route found, redirecting to /");
        next("/");
        return;
    }
    if(requiresAuth) {
        if(!authStore.isLoggedIn()) {
            console.log("User is not logged in, redirecting to /");
            alertStore.addAlert("You must be logged in to access that page.", "error");
            next("/");
            return;
        }
    }
    next();
});