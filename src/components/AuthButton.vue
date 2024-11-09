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
    "btn-error": authStore.isLoggedIn(),
    "discord-btn": !authStore.isLoggedIn(),
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
    <img v-if="!authStore.isLoggedIn()" src="https://cdn.prod.website-files.com/6257adef93867e50d84d30e2/636e0a6cc3c481a15a141738_icon_clyde_white_RGB.png" width="24" height="24" alt="Discord logo"/>
    {{authStore.isLoggedIn() ? `Logout of ${authStore.user.global_name}` : "Login via Discord"}}
  </button>
</template>

<style scoped>

.discord-btn {
  background-color: #7289DA;
  color: white;
}

@media (prefers-color-scheme: dark) {
  .discord-btn {
    background-color: #5865F2;
  }
}

@media(hover: hover) {
  .discord-btn:hover {
    background-color: #5865F2;
    color: white;
  }
}

</style>