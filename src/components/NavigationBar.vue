<script setup>

import AuthButton from "@/components/AuthButton.vue";
import {RouterLink} from "vue-router";
import {useAuthStore} from "@/stores/auth";

const authStore = useAuthStore();
</script>

<template>
  <div class="navbar bg-base-100">
    <div class="flex-1">
      <RouterLink to="/" class="btn btn-ghost text-xl">Compass</RouterLink>
      <ul v-if="authStore.isLoggedIn()" class="menu menu-horizontal">
        <RouterLink to="/gallery" class="btn btn-ghost">Gallery</RouterLink>
      </ul>
    </div>
    <div class="flex-none float-right right-0">
      <ul class="menu menu-horizontal px-1">
<!--        <li><a>Login via Discord</a></li>-->
        <AuthButton />
        <div v-if="authStore.isLoggedIn()" class="avatar pl-2">
          <div class="rounded-full w-10 h-10 m-1">
            <img :src="authStore.getAvatarUrl()" alt="avatar" />
          </div>
        </div>
        <li>
<!--          <details>-->
<!--            <summary>Parent</summary>-->
<!--            <ul class="bg-base-100 rounded-t-none p-2">-->
<!--              <li><a>Link 1</a></li>-->
<!--              <li><a>Link 2</a></li>-->
<!--            </ul>-->
<!--          </details>-->
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>

</style>