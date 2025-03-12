<script setup>
import {onMounted, ref, useTemplateRef} from "vue";
import {apiForwardRequestRaw, getModelsByQuery} from "@/services/CivitAIService";
import ModelCard from "@/components/model-browser/ModelCard.vue";
import ModelSearchControls from "@/components/model-browser/ModelSearchControls.vue";
import {useAlertStore} from "@/stores/alerts";
import {isDownloadAllowed} from "@/services/NavigatorService";

const models = ref([])
const paginationData = ref({})

const searchControls = useTemplateRef("searchControls")

const filters = ref({
  search: "",
  searchByTag: false,
  type: "",
  nsfw: false,
})

const isLoading = ref(true)
const alerts = useAlertStore()

const downloadsEnabled = ref(true) // Default to true so that the warning doesn't preemptively appear then hide

const fetchModels = async () => {
  isLoading.value = true
  if(filters.value.searchByTag) {
    getModelsByQuery(filters.value.search, filters.value.type, filters.value.nsfw, 25, true).then(m => {
      console.log("Fetched models from CivitAI", m.data)
      models.value = m.data.items
      paginationData.value = m.data.metadata
      isLoading.value = false
    }).catch((e) => {
      console.error("Failed to fetch models from CivitAI", e)
      isLoading.value = false
      alerts.addAlert("Failed to fetch models from CivitAI", "error")
    })
  } else {
    getModelsByQuery(filters.value.search, filters.value.type, filters.value.nsfw).then(m => {
      console.log("Fetched models from CivitAI", m.data)
      models.value = m.data.items
      paginationData.value = m.data.metadata
      isLoading.value = false
    }).catch((e) => {
      console.error("Failed to fetch models from CivitAI", e)
      isLoading.value = false
      alerts.addAlert("Failed to fetch models from CivitAI", "error")
    })
  }
}

const updateFilters = (newFilters) => {
  filters.value = newFilters
  fetchModels()
}

// The onPageNext handles getting models a bit differently, by using the `nextPage` url
//  from the initial response.
const onPageNext = () => {
  isLoading.value = true
  const endpoint = paginationData.value.nextPage.replaceAll("https://civitai.com/api/v1/", "")
  apiForwardRequestRaw(endpoint).then(m => {
    console.log("Fetched next page of models from CivitAI", m.data)
    // Remove the first entry from the new array,
    //  as CivitAI seems to return the last item from the previous page as well
    m.data.items.shift()
    models.value = models.value.concat(m.data.items)
    paginationData.value = m.data.metadata
    isLoading.value = false
  }).catch((e) => {
    console.error("Failed to fetch next page of models from CivitAI", e)
    isLoading.value = false
    alerts.addAlert("Failed to fetch next page of models from CivitAI", "error")
  })
}

const onTagClicked = (tag) => {
  searchControls.value.activateTagSearch(tag)
}

onMounted(async () => {
  console.log("Fetching models from CivitAI...")
  try {
    let downloadEnabledResp = await isDownloadAllowed()
    if(downloadEnabledResp.data.downloadsEnabled === true) {
      downloadsEnabled.value = true;
    } else {
      downloadsEnabled.value = false;
      alerts.addAlert("Downloads are disabled on this server.", "warning")
    }
  } catch (e) {
    console.error("Failed to check availability of downloads", e)
    downloadsEnabled.value = false;
  }

  await fetchModels();
})
</script>

<template>
  <div>
    <h1 class="text-center text-lg mb-5">Model Browser</h1>
    <div v-if="!downloadsEnabled" class="alert alert-warning mb-2 text-wrap w-fit ml-auto mr-auto">
      <svg
           xmlns="http://www.w3.org/2000/svg"
           fill="none"
           viewBox="0 0 24 24"
           class="h-6 w-6 shrink-0 stroke-current">
        <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <p class="">Downloads are disabled on this server. You may browse through models, but you will not be able to download them.</p>
    </div>
    <ModelSearchControls ref="searchControls" @update:filters="updateFilters" :loading="isLoading" />
    <div v-if="isLoading && models.length === 0" class="flex justify-center items-center h-32">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <div class="mt-3 ">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-6 gap-5">
        <ModelCard v-for="model in models" :key="model.id" :model="model" @on-tag-clicked="onTagClicked"
                   :blur-n-s-f-w="!filters.nsfw" :downloads-enabled="downloadsEnabled" />
      </div>
      <div v-if="paginationData.nextPage !== undefined" class="w-fit ml-auto mr-auto mt-5">
        <button v-if="!isLoading" @click="onPageNext" class="btn btn-outline">Load More</button>
        <span v-else class="btn btn-outline">Loading... <span class="loading loading-spinner"></span></span>
      </div>
    </div>

    <p v-if="models.length === 0 && !isLoading" class="text-center text-xl font-bold absolute top-1/2 bottom-1/2 w-full">Sorry, no models could be found!</p>
  </div>
</template>

<style scoped>

</style>