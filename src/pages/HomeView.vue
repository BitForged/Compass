<script setup>
import {useAuthStore} from "../stores/auth";
import {onMounted} from "vue";
import {useRouter} from "vue-router";

const authStore = useAuthStore()
const router = useRouter()

onMounted(async () => {
  if(router.currentRoute.value.query.code) {
    console.log("Logging in to Navigator with code")
    await authStore.login(router.currentRoute.value.query.code)
    await router.replace({query: {}})
  }
})

function login() {
  // authStore.login()
}
</script>

<template>
  <div>
    <div class="hero min-h-screen">
      <div class="hero-content text-center">
        <div class="max-w-lg">
          <h1 class="text-5xl font-bold">Welcome aboard!</h1>
          <p class="pt-6 pb-3">
            Welcome to Compass, a companion application to BitJourney.
          </p>
          <p class="py-6">
            You'll be able to view any images that you've generated from BitJourney here. To get started, login with your Discord account at the top right!
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>