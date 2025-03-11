<script setup>
import { ref, watch } from "vue";
import { ModelTypes } from "@/services/CivitAIService";

const searchQuery = ref("");
const searchByTag = ref(false);
const selectedType = ref("");
const showNSFW = ref(false);
let debounceTimer = null;

const emit = defineEmits(["update:filters"]);

defineProps({
  loading: Boolean,
})

const debounceSearch = () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    emit("update:filters", {
      search: searchQuery.value,
      searchByTag: searchByTag.value,
      type: selectedType.value,
      nsfw: showNSFW.value,
    });
  }, 500);
};

// Watch for other filter changes and emit immediately
watch([selectedType, showNSFW, searchByTag], () => {
  emit("update:filters", {
    search: searchQuery.value,
    searchByTag: searchByTag.value,
    type: selectedType.value,
    nsfw: showNSFW.value,
  });
});
</script>

<template>
  <div class="flex flex-col md:flex-row gap-4 items-center justify-between bg-neutral p-4 rounded-lg shadow-lg">
    <!-- Search Input -->
    <div class="flex items-center gap-2 w-full md:w-auto">
      <input
          v-model="searchQuery"
          @input="debounceSearch"
          type="text"
          placeholder="Search models..."
          class="input input-bordered w-full md:w-64"
      />
      <span v-if="loading" class="right-3">
        <span class="loading loading-bars loading-md"></span>
      </span>
      <label class="cursor-pointer flex items-center gap-2">
        <input type="checkbox" v-model="searchByTag" class="toggle toggle-sm" />
        <span v-if="!searchByTag" class="text-sm">Search by tag</span>
        <span v-else class="text-sm text-success">Search by tag</span>
      </label>
    </div>

    <!-- Model Type Selector -->
    <div class="flex-1 flex justify-center">
      <select v-model="selectedType" class="select select-bordered w-48">
        <option value="">All Types</option>
        <option v-for="(type, key) in ModelTypes" :key="key" :value="type.apiValue">{{type.label}}</option>
      </select>
    </div>

    <!-- NSFW Toggle -->
    <label class="cursor-pointer flex items-center gap-2">
      <input type="checkbox" v-model="showNSFW" class="toggle toggle-sm" />
      <span v-if="!showNSFW" class="text-sm">Show NSFW</span>
      <span v-else class="text-sm text-error">Show NSFW</span>
    </label>
  </div>
</template>

<style scoped>

</style>