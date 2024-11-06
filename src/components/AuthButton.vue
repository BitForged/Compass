<script setup>
import { useAuthStore } from "@/stores/auth";
import {computed} from "vue";

const authStore = useAuthStore();

const clientID = import.meta.env.VITE_DISCORD_CLIENT_ID;
const redirectURI = import.meta.env.VITE_DISCORD_REDIRECT_URI;

const btnStyle = computed(() => {
  return {
    "btn": true,
    "btn-outline": true,
    "btn-primary": !authStore.isLoggedIn(),
    "btn-error": authStore.isLoggedIn()
  }
});

function performOAuthRedirect() {
  const url = `https://discord.com/api/oauth2/authorize?client_id=${clientID}&redirect_uri=${encodeURIComponent(redirectURI)}&response_type=code&scope=identify`;
  window.location.href = url;
}

async function toggleAuth() {
  if(authStore.isLoggedIn()) {
    authStore.logout();
  } else {
    // Redirect to Discord OAuth
    console.log("Preparing to redirect to Discord OAuth");
    performOAuthRedirect();
  }
}

</script>

<template>
  <button :class="btnStyle" @click="toggleAuth">
    {{authStore.isLoggedIn() ? `Logout of ${authStore.user.global_name}` : "Login via Discord"}}
  </button>
</template>

<style scoped>

</style>