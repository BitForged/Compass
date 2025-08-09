<script setup>
import {computed, ref} from 'vue';
import VLazyImage from "v-lazy-image";

const props = defineProps(['lora'])

const imgFailed = ref(false)
const imgUnavailableText = computed(() => {
  if(imgFailed.value) {
    return "Image Failed to Load"
  }
  return "No Image Available"
})

const metadata = computed(() => {
  return props.lora?.metadata
})
</script>

<template>
  <div class="card bg-base-300 shadow-xl cursor-pointer hover:bg-base-200 transition-colors duration-200">
    <figure>
      <div class="w-full h-48 bg-gray-700 flex items-center justify-center">
        <v-lazy-image v-if="metadata.images.length > 0 && !imgFailed" @error="imgFailed = true" :src="metadata.images[0].url" alt="Sample Image" class="w-full h-full object-cover rounded-lg" />
        <span v-else class="text-gray-400">{{imgUnavailableText}}</span>
      </div>
    </figure>
    <div class="card-body p-4">
      <h2 class="card-title text-sm">{{ metadata.name }}</h2>
      <p class="text-xs">Base Model: {{ metadata.base_model }}</p>
      <div class="card-actions justify-end mt-2">
        <div class="flex flex-wrap gap-1">
          <div v-for="word in metadata.training_words" :key="word" class="badge badge-outline text-pretty line-clamp-3 m-1">{{ word }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
