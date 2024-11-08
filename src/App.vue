<script setup>
import NavigationBar from "./components/NavigationBar.vue";
import { RouterView } from "vue-router";
import Alert from "@/components/Alert.vue";

import { useAuthStore } from "@/stores/auth";
import { onMounted } from "vue";

const authStore = useAuthStore();
onMounted(() => {
  if(authStore.isLoggedIn()) {
    console.log("Checking if token is still valid");
    authStore.verifyTokenIsStillValid();
  }
});
</script>

<template>
  <div>
    <NavigationBar />
    <div class="p-4">
      <Alert />
      <RouterView />
    </div>

  </div>
</template>

<style scoped>
</style>
