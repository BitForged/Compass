<script setup>
import {useAuthStore} from "@/stores/auth";
import {onMounted, ref} from "vue";
import {useRouter} from "vue-router";
import HomeImageCarousel from "@/components/home/HomeImageCarousel.vue";
import AuthButton from "@/components/AuthButton.vue";

const authStore = useAuthStore()
const router = useRouter()

const showHero = ref(false)
const showCarousel = ref(false)

onMounted(async () => {
  if(router.currentRoute.value.query.code) {
    console.log("Logging in to Navigator with code")
    await authStore.login(router.currentRoute.value.query.code)
    await router.replace({query: {}})
  }
  setTimeout(() => {
    showHero.value = true;
  }, 250)
  setTimeout(() => {
    showCarousel.value = true;
  }, 500)
})

</script>

<template>
  <div>
    <Transition name="fade">
      <div v-show="showHero">
        <div  class="hero py-5">
          <div class="hero-content text-center">
            <div class="max-w-lg">
              <h1 class="text-5xl font-bold">Welcome aboard!</h1>
              <p class="pt-6 pb-3">
                Welcome to Compass, a companion application to BitJourney.
              </p>
              <p class="py-6">
                Compass is your guide to creating images with Stable Diffusion!
              </p>
              <p class="py-1 text-sm italic">Hence the name "Compass"!</p>
              <RouterLink v-if="authStore.isLoggedIn()" :to="{name: 'txt2img'}"><button class="btn btn-primary btn-primary-glow mt-4">Start Generating Images!</button></RouterLink>
              <AuthButton v-else class="mt-4 btn-discord-glow" />
            </div>
          </div>
        </div>
      </div>
    </Transition>
    <Transition name="fade">
      <div v-show="showCarousel" class="flex justify-center py-2 rounded-t-xl">
        <HomeImageCarousel />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s ease;
  transition-delay: 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
.btn-primary-glow {
  animation: glow 1.5s ease-in-out infinite alternate;
  color: #fff;
  box-shadow: 0 0 35px #1740e0;
}

.btn-discord-glow {
  animation: discord-glow 1.5s ease-in-out infinite alternate;
  color: #fff;
  box-shadow: 0 0 35px #7289da;
}

@keyframes glow {
  from {
    box-shadow: 0 0 15px #1740e0;
  }
  to {
    box-shadow: 0 0 35px #1740e0;
    opacity: 0.8;
  }
}

@keyframes discord-glow {
  from {
    box-shadow: 0 0 15px #7289da;
    color: #fff;
  }
  to {
    box-shadow: 0 0 35px #7289da;
    color: #fff;
    opacity: 0.8;
  }
}

</style>