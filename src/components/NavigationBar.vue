<script setup>
import AuthButton from "@/components/AuthButton.vue";
import { RouterLink } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import {computed, onMounted, ref} from "vue";
import {useAlertStore} from "@/stores/alerts";
import {isDownloadAllowed} from "@/services/NavigatorService";

const authStore = useAuthStore();

const isDev = import.meta.env.VITE_DEV || false;
const downloadsEnabled = ref(false)

const isDevMode = computed(() => {
  return isDev;
});

const promptComingSoon = () => {
  useAlertStore().addAlert("This feature is coming soon!", "info");
};

onMounted(async () => {
  let resp = await isDownloadAllowed()
  if(resp.status === 200 && resp.data.downloadsEnabled === true) {
    downloadsEnabled.value = true;
  } else {
    downloadsEnabled.value = false;
  }
})
</script>

<template>
  <div class="navbar">
    <div class="navbar-start">
      <div class="dropdown">
        <div tabindex="0" role="button" class="btn btn-ghost lg:hidden">
          <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor">
            <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h8m-8 6h16" />
          </svg>
        </div>
        <!-- Mobile Navigation Dropdown Menu -->
        <ul tabindex="0" class="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow">
          <li v-if="authStore.isLoggedIn()">
            <RouterLink to="/gallery" class="btn btn-ghost">Gallery</RouterLink>
          </li>
          <li v-if="authStore.isLoggedIn()">
            <RouterLink :to="{name: 'txt2img'}" class="btn btn-ghost">Generate</RouterLink>
          </li>
          <li v-if="authStore.isLoggedIn()">
            <RouterLink :to="{name: 'settings'}" class="btn btn-ghost">Settings</RouterLink>
          </li>
          <li v-if="downloadsEnabled && authStore.isLoggedIn() && authStore.role >= 2"> <!-- Downloading Models would require at least Role 2, so hide if under this -->
            <RouterLink to="/model-browser" class="btn btn-ghost">Model Browser</RouterLink>
          </li>
          <li>
            <AuthButton />
          </li>
        </ul>
      </div>
      <img src="/compass-logo-md.png" alt="Compass" class="w-8 h-8" />
      <RouterLink to="/" class="btn btn-ghost text-xl">Compass</RouterLink>
    </div>
    <!-- Desktop Navigation menu -->
    <div v-if="authStore.isLoggedIn()" class="navbar-center hidden lg:flex">
      <ul class="menu menu-horizontal px-1">
        <li>
          <RouterLink to="/gallery" class="btn btn-ghost">Gallery</RouterLink>
        </li>
        <li>
          <RouterLink :to="{name: 'txt2img'}" class="btn btn-ghost">Generate</RouterLink>
        </li>
        <li>
          <RouterLink to="/settings" class="btn btn-ghost">Settings</RouterLink>
        </li>
        <li v-if="downloadsEnabled && authStore.isLoggedIn() && authStore.role >= 2"> <!-- Downloading Models would require at least Role 2, so hide if under this -->
          <RouterLink to="/model-browser" class="btn btn-ghost">Model Browser</RouterLink>
        </li>
      </ul>
    </div>
    <div class="navbar-end hidden lg:flex">
      <AuthButton />
      <div v-if="authStore.isLoggedIn()" class="avatar pl-2">
        <div class="rounded-full w-12 h-12 m-1">
          <img :src="authStore.getAvatarUrl()" alt="avatar" class="w-full h-full object-cover" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.navbar {
  max-width: 100%;
}
</style>