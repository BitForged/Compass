<script setup>
import {computed, ref, watch} from "vue";
import {useAlertStore} from "@/stores/alerts";
import {downloadModelById} from "@/services/NavigatorService";

const props = defineProps(['model', 'blurNSFW', 'downloadsEnabled'])
const emit = defineEmits(['onTagClicked'])
const alerts = useAlertStore()
const selectedVersion = ref(props.model.modelVersions[0])

const firstFiveTags = computed(() => props.model.tags.slice(0, 5));

const isDownloading = ref(false)
const hasDownloaded = ref(false)

const downloadModel = () => {
  isDownloading.value = true;
  hasDownloaded.value = false;
  alerts.addAlert("Downloading model... Feel free to navigate away, this may take a while.", "info");
  downloadModelById(selectedVersion.value.id).then((res) => {
    console.log("Download complete", res);
    alerts.addAlert("Download complete!", "success");
    isDownloading.value = false;
    hasDownloaded.value = true;
  }).catch((error) => {
    console.error("Failed to download model", error);
    alerts.addAlert("Failed to download model", "error");
    isDownloading.value = false;
    hasDownloaded.value = false;
  })
}

const normalizedCaseOfType = () => {
  const str = props.model.type;
  if(str === "LORA") return "LoRA" // LORA is a special case, the proper phrase is "LoRA"
  const firstChar = str.charAt(0).toUpperCase();
  const restOfString = str.slice(1).toLowerCase();

  return firstChar + restOfString;
}

watch(() => selectedVersion.value.id, () => {
  // Reset download state
  console.log("Selected version changed, resetting download state")
  hasDownloaded.value = false
  isDownloading.value = false
})

watch(() => props.model, () => {
  // Force update the selected version back to the first available version
  selectedVersion.value = props.model.modelVersions[0]
  console.log("Model changed, resetting selected version")
})

</script>

<template>
  <div class="card card-bg-dark w-96 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all h-fit">
    <figure>
      <img class="w-full h-96 object-cover rounded-t-lg" :src="selectedVersion?.images[0]?.url" :alt="'Preview image of ' + model.name">
    </figure>
    <div class="card-body">
      <h2 class="card-title text-white text-lg mb-2 text-ellipsis"><a :href="`https://civitai.com/models/${model.id}/${selectedVersion.id}`">{{model.name}}</a></h2>
      <span class="text-gray-400 text-xs font-medium mb-2">Type: {{ normalizedCaseOfType() }}</span>
      <span class="text-gray-400 text-xs font-medium mb-2">Base: {{ selectedVersion.baseModel }}</span>
      <!-- Display Creator if Known -->
      <div v-if="model.creator !== undefined" class="flex items-center gap-2">
        <img :src="model.creator.image" :alt="'Avatar of ' + model.creator.username" class="rounded-full w-8 h-8"/>
        <span class="text-sm align-middle">{{model.creator.username}}</span>
      </div>


      <div class="flex flex-wrap gap-1 mt-2">
        <span v-for="tag in firstFiveTags" @click="emit('onTagClicked', tag)" :key="tag" class="badge badge-outline bg-yellow-800/50 badge-warning badge-sm text-xs px-2 py-2 cursor-pointer">{{tag}}</span>
      </div>
      <!-- Version Selector -->
      <div class="mt-3">
        <label class="text-sm text-white">Select Version:</label>
        <select v-model="selectedVersion" class="select select-bordered w-full mt-1 text-white bg-neutral">
          <option v-for="version in model.modelVersions" :key="version.id" :value="version">
            {{ version.name || "No Name Provided" }}
          </option>
        </select>
      </div>
      <div v-if="downloadsEnabled" class="card-actions mt-4">
        <button v-if="!isDownloading && !hasDownloaded" @click="downloadModel" class="btn btn-primary w-full px-4">Download</button>
        <button v-else-if="!hasDownloaded" disabled class="btn btn-success w-full px-4">Downloading... <span class="loading loading-spinner"></span></button>
        <button v-else-if="hasDownloaded === true" class="btn btn-success w-full px-4">Download Complete</button>
      </div>
    </div>
  </div>
</template>

<style scoped>

.card-bg-dark {
  background-color: rgb(34, 34, 34);
}

</style>