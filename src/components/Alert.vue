<script setup>
import { useAlertStore } from "@/stores/alerts";
import {computed} from "vue";

const alertStore = useAlertStore()
const alertClass = computed(() => {
  if(alertStore.getFirstAlert() === null) {
    return {
      "alert": false,
      "alert-error": false,
      "alert-info": false,
      "alert-warning": false,
      "alert-success": false
    }
  }
  return {
    "alert": true,
    "alert-error": alertStore.getFirstAlert().type === 'error',
    "alert-info": alertStore.getFirstAlert().type === 'info',
    "alert-warning": alertStore.getFirstAlert().type === 'warning',
    "alert-success": alertStore.getFirstAlert().type === 'success'
  }
})

const isAlertVisible = computed(() => {
  return alertStore.getFirstAlert() !== null
})
</script>

<template>
  <div v-if="isAlertVisible" class="toast max-md:toast-center lg:toast-start toast-top z-20 max-md:w-full drop-shadow-md">
    <div class="text-wrap max-md:ml-auto max-md:mr-auto drop-shadow-md" :class="alertClass">
      <svg v-if="alertStore.getFirstAlert().type === 'success'"
           xmlns="http://www.w3.org/2000/svg"
           class="h-6 w-6 shrink-0 stroke-current"
           fill="none"
           viewBox="0 0 24 24">
        <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <svg v-if="alertStore.getFirstAlert().type === 'error'"
           xmlns="http://www.w3.org/2000/svg"
           class="h-6 w-6 shrink-0 stroke-current"
           fill="none"
           viewBox="0 0 24 24">
        <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <svg v-if="alertStore.getFirstAlert().type === 'info'"
           xmlns="http://www.w3.org/2000/svg"
           fill="none"
           viewBox="0 0 24 24"
           class="h-6 w-6 shrink-0 stroke-current">
        <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <svg v-if="alertStore.getFirstAlert().type === 'warning'"
           xmlns="http://www.w3.org/2000/svg"
           class="h-6 w-6 shrink-0 stroke-current"
           fill="none"
           viewBox="0 0 24 24">
        <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <span>{{alertStore.getFirstAlert().message}}</span>
    </div>
  </div>
</template>

<style scoped>
</style>