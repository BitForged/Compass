<script setup>
import { computed } from 'vue';

const props = defineProps(['lora'])

const metadata = computed(() => {
  return props.lora?.metadata
})
</script>

<template>
  <div class="card bg-base-300 shadow-xl cursor-pointer hover:bg-base-200 transition-colors duration-200">
    <figure>
      <!-- Placeholder for LoRA image -->
      <div class="w-full h-48 bg-gray-700 flex items-center justify-center">
        <span class="text-gray-400">Sample Image</span>
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
