<script setup>
import {deleteImage, getMyJobs} from "@/services/UserService";
import {onMounted, ref} from "vue";
import {useAlertStore} from "@/stores/alerts";

const jobs = ref([]);

function getImageForJob(job) {
  return `${import.meta.env.VITE_API_BASE}/api/images/${job.id}`;
}

function onImageClick(job) {
  console.log(`Clicked on image for job ${job.id}`);
  window.open(getImageForJob(job), "_blank").focus();
}

function onDeleteClick(job) {
  console.log(`Clicked on delete for job ${job.id}`);
  deleteImage(job.id).then((res) => {
    if(res.status !== 204) {
      console.error(`Failed to delete image for job ${job.id}`, res);
      useAlertStore().addAlert(`Failed to delete image with ID: ${job.id}`, "error");
      return;
    }
    console.log(`Deleted image for job ${job.id}`);
    jobs.value = jobs.value.filter(j => j.id !== job.id);
    useAlertStore().addAlert(`Image deleted successfully`, "success");
  }).catch((error) => {
    console.error(`Failed to delete image for job ${job.id}`, error);
    useAlertStore().addAlert(`Failed to delete image with ID: ${job.id}`, "error");
  });
}

onMounted(async () => {
  let retrievedJobs = await getMyJobs();
  jobs.value = retrievedJobs.data;
});
</script>

<template>
  <div>
    <h1 class="text-2xl text-center py-4">Your Images</h1>
    <div class="w-full text-center">
      <div class="stats shadow  ml-auto mr-auto">
        <div class="stat stat-custom">
          <div class="stat-title">Images Generated</div>
          <div class="stat-value">{{jobs.length}}</div>
        </div>
      </div>
    </div>
    <div v-if="jobs.length === 0" class="text-center">
      <p>You have no images yet. Generate some through BitJourney on Discord!</p>
    </div>
    <div v-else class="text-gray-400 py-2">
      <p>Click on an image to view it in full size.</p>
    </div>
    <div class="grid grid-cols-4 gap-4">
      <div v-for="job in jobs" :key="job.id" class="card card-border bordered col-auto hover:animate-pulse">
        <div class="card-body">
          <h2>{{job.id}}</h2>
          <img @click="onImageClick(job)" class="job-image" width="512" :src="getImageForJob(job)" alt="Job Image">{{job.description}}</img>
          <div class="card-actions justify-end">
            <button @click="onDeleteClick(job)" class="btn btn-error">Delete</button>
          </div>
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

.stat-custom {
  background-color: oklch(var(--n));
}
</style>