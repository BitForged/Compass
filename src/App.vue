<script setup>
import NavigationBar from "./components/NavigationBar.vue";
import { RouterView } from "vue-router";
import Alert from "@/components/Alert.vue";
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
