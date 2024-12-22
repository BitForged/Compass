<script setup>
import {deleteImage, getMyJobs} from "@/services/UserService";
import {onMounted, ref} from "vue";
import {useAlertStore} from "@/stores/alerts";
import VLazyImage from "v-lazy-image";
import CategorySelect from "@/components/CategorySelect.vue";
import {getMyCategories, setCategory} from "@/services/NavigatorService";

const jobs = ref([]);
const selectedCategoryId = ref(null);
const categories = ref([])

const pendingDeleteId = ref("");
const pendingDeleteTimeoutId = ref(null);

const updatingCategoryForJob = ref(null);

const paginationData = ref({
  page: 1,
  perPage: 10,
  totalItems: 0,
  totalPages: 0,
});

function getJobs() {
  if(selectedCategoryId.value === null) {
    return jobs.value;
  } else {
    return jobs.value.filter(j => j.category_id === selectedCategoryId.value);
  }
}

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
    fetchPage(paginationData.value.page);
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

const getCategoryName = (categoryId) => {
  if(categoryId === null) {
    return "Uncategorized";
  }
  const category = categories.value.find(c => c.id === categoryId);
  if(!category) {
    return "Unknown";
  }
  return category.name;
};

const onCategorySelected = async (categoryId) => {
  console.log(`Selected category with ID: ${categoryId}`);
  selectedCategoryId.value = categoryId;
  await fetchCategories();
  await fetchPage(1, 10, categoryId);
};

const onCategoriesChanged = async () => {
  console.log(`Refreshing categories`);
  await fetchCategories();
};

const onCategoryUpdate = async (jobId) => {
  console.log(`Updating category for job ${jobId}`);
  if(updatingCategoryForJob.value === jobId) {
    updatingCategoryForJob.value = null;
    return;
  }
  updatingCategoryForJob.value = jobId;
};

const onCategoryUpdateConfirmed = async (categoryId) => {
  if(categoryId === null) {
    return;
  }
  console.log(`Updating category for job ${updatingCategoryForJob.value} to ${categoryId}`);
  const job = jobs.value.find(j => j.id === updatingCategoryForJob.value);
  updatingCategoryForJob.value = null;
  if(!job) {
    console.error(`Failed to find job with ID ${updatingCategoryForJob.value}`);
    useAlertStore().addAlert(`Failed to find job with ID ${updatingCategoryForJob.value}`, "error");
    return;
  }
  if(categoryId === -100) {
    console.log(`Deleting category for job ${job.id}`);
    categoryId = 0;
  }
  setCategory(job.id, categoryId).then((res) => {
    if (res.status !== 204) {
      console.error(`Failed to update category for job ${job.id}`, res);
      useAlertStore().addAlert(`Failed to update category for job ${job.id}`, "error");
      return;
    }
    console.log(`Updated category for job ${job.id} to ${categoryId}`);
    // Update the job in the list
    if(categoryId === 0) {
      job.category_id = null;
    } else {
      job.category_id = categoryId;
    }
    useAlertStore().addAlert(`Updated category for job ${job.id} to ${categoryId}`, "success");
  });
};

const onImageLoaded = (element) => {
  // We receive an HTMLImageElement from the event, which we can use to get the image's natural dimensions
  let width = element.naturalWidth;
  let height = element.naturalHeight;
  console.log(`Image loaded with dimensions: ${element.naturalWidth}x${element.naturalHeight}`);
  // Find the job ID from the image's src attribute, which is the last part of the URL
  const jobId = element.src.split("/").pop();
  console.log(`Image loaded for job ${jobId}`);
  if(width * height > (1024 * 1024)) {
    console.log(`Image for job ${jobId} is high resolution`);
    const job = jobs.value.find(j => j.id === jobId);
    if(job) {
      job.isHighRes = true;
    }
  }
};

const forceRecaluclateIsJobHighRes = (jobId) => {
  const element = document.getElementById(jobId);
  if(!element) {
    return;
  }
  onImageLoaded(element);
};

const fetchCategories = async () => {
  getMyCategories().then((res) => {
    categories.value = res.data;
  }).catch((error) => {
    console.error("Failed to get categories", error);
  });
}

const nearbyPages = (page, totalPages) => {
  let nearby = [];
  const maxDistance = 2;
  for (let i = Math.max(1, page - maxDistance); i <= Math.min(totalPages, page + maxDistance); i++) {
    nearby.push(i);
  }
  return nearby;
};

const fetchPage = async (page) => {
  let retrievedJobs = await getMyJobs(page, 10, selectedCategoryId.value);
  jobs.value = retrievedJobs.data.images;
  paginationData.value.page = retrievedJobs.data.currentPage;
  paginationData.value.totalPages = retrievedJobs.data.totalPages;
  paginationData.value.totalItems = retrievedJobs.data.count;
  for(let job of jobs.value) {
    forceRecaluclateIsJobHighRes(job.id);
  }
}

const isPageChecked = (page) => {
  return paginationData.value.page === page;
};

onMounted(async () => {
  let retrievedJobs = await getMyJobs();
  jobs.value = retrievedJobs.data.images;
  paginationData.value.page = retrievedJobs.data.currentPage;
  paginationData.value.totalPages = retrievedJobs.data.totalPages;
  paginationData.value.totalItems = retrievedJobs.data.count;
  await fetchCategories();
});
</script>

<template>
  <div>
    <h1 class="text-2xl text-center py-4">Your Images</h1>
    <div class="w-full text-center">
      <div class="stats shadow  ml-auto mr-auto">
        <div class="stat stat-custom">
          <div class="stat-title">Images Generated</div>
          <div class="stat-value">{{paginationData.totalItems}}</div>
        </div>
        <div class="stat stat-custom">
          <div class="stat-title"># of Categories</div>
          <div class="stat-value">{{categories.length}}</div>
        </div>
      </div>
      <div class="mt-2">
        <p>Filter By Category</p>
        <CategorySelect :category-id="selectedCategoryId" @onCategorySelected="onCategorySelected" @onCategoriesChanged="onCategoriesChanged" allow-modify="true"/>
      </div>
    </div>
    <div class="w-full flex justify-center items-center">
      <div class="join mt-5 mb-4 w-fit">
        <button v-if="paginationData.page > 1" @click="fetchPage(1)" class="btn btn-accent"><<</button>
        <input v-for="nearbyPage in nearbyPages(paginationData.page, paginationData.totalPages)" :key="'top-paginator-'+nearbyPage" class="join-item btn btn-square" type="radio" name="top-options" :aria-label="nearbyPage" @click="fetchPage(nearbyPage)" :checked="isPageChecked(nearbyPage)">
        <button v-if="paginationData.page < paginationData.totalPages" @click="fetchPage(paginationData.totalPages)" class="btn btn-accent">>></button>
      </div>
    </div>
    <div v-if="getJobs().length === 0" class="text-center mt-2">
      <p>You have no images yet (or they are all filtered out). Generate some through BitJourney on Discord, or via the Generate tab!</p>
    </div>
    <div v-else class="text-gray-400 py-2">
      <p>Click on an image to view it in full size.</p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
      <div  v-for="job in getJobs()" :key="job.id" class="card card-custom bordered col-auto hover:animate-pulse">
        <div class="card-body">
          <div class="image-container">
            <v-lazy-image :id="job.id" @load="onImageLoaded" @click="onImageClick(job)" class="job-image" src-placeholder="/loading.gif" :src="getImageForJob(job)" width="512" alt="Job Image" />
            <div v-if="job.isHighRes === true" class="corner-icon">
            </div>
          </div>
          <div class="card-actions justify-end">
            <button @click="onCategoryUpdate(job.id)" class="btn btn-accent">Categorize</button>
            <RouterLink :to="{ name: 'img2img', query: { input: job.id}}" class="btn btn-primary">Img2Img</RouterLink>
            <RouterLink :to="{ name: 'txt2img', query: { recall: job.id}}" class="btn btn-info">Recall</RouterLink>
            <button v-if="!isPendingDelete(job)" @click="setPendingDelete(job)" class="btn btn-warning">Delete?</button>
            <button v-else @click="onDeleteClick(job)" class="btn btn-error btn-delete">Confirm!</button>
          </div>
          <div class="card-footer">
            <CategorySelect v-if="updatingCategoryForJob === job.id" @onCategorySelected="onCategoryUpdateConfirmed" show-remove-option="true" />
            <div class="grid grid-cols-3 mt-2">
                <div class="col-auto">
                  <span class="text-xs text-gray-400">Job ID: {{job.id}}</span>
                </div>
                <div class="col-auto">
                </div>
                <div v-if="job.category_id !== null" class="col-auto">
                  <span class="text-xs text-gray-400">Category: {{getCategoryName(job.category_id)}}</span>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="w-full flex justify-center items-center">
      <div class="join mt-4 w-fit">
        <button v-if="paginationData.page > 1" @click="fetchPage(1)" class="btn btn-accent"><<</button>
        <input v-for="page in nearbyPages(paginationData.page, paginationData.totalPages)" :key="'bottom-paginator+'+page" class="join-item btn btn-square" type="radio" name="bottom-options" :aria-label="page" @click="fetchPage(page)" :checked="isPageChecked(page)">
        <button v-if="paginationData.page < paginationData.totalPages" @click="fetchPage(paginationData.totalPages)" class="btn btn-accent">>></button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-custom {
  background-color: #3C3A36;
  box-shadow: 0 0 15px rgba(255, 215, 215, 0.013), 0 0 30px rgba(173, 216, 230, 0.1), 0 6px 10px rgba(0, 0, 0, 0.4);
  /*box-shadow: 0px 0px 15px rgba(255, 153, 153, 0.25),
  0px 0px 30px rgba(255, 102, 102, 0.15),
  0px 6px 10px rgba(0, 0, 0, 0.4);*/
  height: fit-content;
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

.corner-icon {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  border-top: 25px solid #00ff04;
  border-right: 25px solid transparent;
  z-index: 10;
}

.stat-custom {
  background-color: oklch(var(--n));
}
</style>