<script setup>
import {deleteImage, getMyJobs} from "@/services/UserService";
import {onMounted, ref} from "vue";
import {useAlertStore} from "@/stores/alerts";
import VLazyImage from "v-lazy-image";

const jobs = ref([]);

const pendingDeleteId = ref("");
const pendingDeleteTimeoutId = ref(null);

function getImageForJob(job) {
  return `${import.meta.env.VITE_API_BASE}/api/images/${job.id}`;
}

function getPreviewForJob(job) {
  return `${import.meta.env.VITE_API_BASE}/api/previews/${job.id}`;
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

function isPendingDelete(job) {
  return pendingDeleteId.value === job.id;
}

function setPendingDelete(job) {
  if(pendingDeleteTimeoutId.value) {
    clearTimeout(pendingDeleteTimeoutId.value);
  }
  pendingDeleteId.value = job.id;
  pendingDeleteTimeoutId.value = setTimeout(() => {
    pendingDeleteId.value = "";
  }, 2500);
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
      <div v-for="job in jobs" :key="job.id" class="card card-custom bordered col-auto hover:animate-pulse">
        <div class="card-body">
          <div class="image-container">
<!--            <img @click="onImageClick(job)" class="job-image" width="512" :src="getImageForJob(job)" alt="Job Image">{{job.description}}</img>-->
            <v-lazy-image @click="onImageClick(job)" class="job-image" :src-placeholder="getPreviewForJob(job)" :src="getImageForJob(job)" width="512" alt="Job Image" />
          </div>
          <div class="card-actions justify-end">
            <button v-if="!isPendingDelete(job)" @click="setPendingDelete(job)" class="btn btn-warning">Delete?</button>
            <button v-else @click="onDeleteClick(job)" class="btn btn-error btn-delete">Confirm!</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-custom {
  background-color: #3C3A36;
  box-shadow: 0px 0px 15px rgba(255, 215, 215, 0.013), 0px 0px 30px rgba(173, 216, 230, 0.1), 0px 6px 10px rgba(0, 0, 0, 0.4);
  /*box-shadow: 0px 0px 15px rgba(255, 153, 153, 0.25),
  0px 0px 30px rgba(255, 102, 102, 0.15),
  0px 6px 10px rgba(0, 0, 0, 0.4);*/
  color: white;
  height: fit-content;
}

.btn-delete {
  color: white;
}

/*.job-image {
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: inset 0px 0px 5px rgba(255, 255, 255, 0.15);

}*/

.image-container {
  position: relative; /* Set position to relative for absolute positioning of the overlay */
  display: inline-block;
  overflow: hidden;
  border-radius: 8px; /* Optional: Gives the image rounded corners */
}

.image-container::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.05));
  pointer-events: none; /* Allows interaction with the image underneath */
}

.image-container img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 8px; /* Ensures the image matches the container's rounded corners */
  transition: transform 0.3s ease;
  &:hover {
    transform: scale(1.05);
  }
}


.stat-custom {
  background-color: oklch(var(--n));
}
</style>