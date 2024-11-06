<script setup>
import { getMyJobs } from "@/services/UserService";
import {onMounted, ref} from "vue";

const jobs = ref([]);

function getImageForJob(job) {
  return `${import.meta.env.VITE_API_BASE}/api/images/${job.id}`;
}

function onImageClick(job) {
  console.log(`Clicked on image for job ${job.id}`);
  window.open(getImageForJob(job), "_blank").focus();
}

onMounted(async () => {
  let retrievedJobs = await getMyJobs();
  jobs.value = retrievedJobs.data;
});
</script>

<template>
  <div>
    <h1 class="text-2xl text-center py-4">Your Images</h1>
    <div class="grid grid-cols-4 gap-4">
      <div v-for="job in jobs" :key="job.id" class="card card-border bordered col-auto hover:animate-pulse">
        <div class="card-body">
          <h2>{{job.id}}</h2>
          <img @click="onImageClick(job)" class="job-image" width="512" :src="getImageForJob(job)" alt="Job Image">{{job.description}}</img>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-border {
  border: 1px dashed oklch(var(--a));
  border-radius: 0.375rem;
}

.job-image {
  cursor: pointer;
}
</style>