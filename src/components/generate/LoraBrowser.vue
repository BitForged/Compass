<script setup>
import {computed, ref, watch} from "vue";
import LoraBrowserCard from "@/components/generate/LoraBrowserCard.vue";

const props = defineProps(['availableLoras', 'enabledLoras', 'show'])
const emit = defineEmits(['close', 'loraSelected'])

const searchQuery = ref("")
const selectedBaseModel = ref("all")

const filteredLoras = computed(() => {
  let loras = mergedLoras.value;
  if (searchQuery.value) {
    loras = loras.filter(lora => lora.metadata.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
  }
  if (selectedBaseModel.value !== 'all') {
    loras = loras.filter(lora => lora.civitai?.baseModel === selectedBaseModel.value)
  }
  return loras;
})

const baseModels = computed(() => {
  const models = new Set(props.availableLoras.map(lora => {
    if (lora.civitai === undefined) return "Unknown"
    return lora.civitai.baseModel
  }))
  return ['all', ...Array.from(models)]
})

const mergedLoras = computed(() => {
  const loras = [...props.availableLoras]
  for (let i = 0; i < loras.length; i++) {
    let metadata = {}
    // We need a few properties to be here:
    // - Sample Image URL (under 'images' array)
    // - LoRA's name
    // - LoRA's base model type
    // - Training words
    // - LoRA ID + Version ID

    // Attempt to fill this data from Civtai first if the LoRA has that metadata available
    if (loras[i].civitai !== undefined) {
      metadata.name = `${loras[i].civitai.model.name} (${loras[i].civitai.name})`
      metadata.base_model = loras[i].civitai.baseModel
      metadata.training_words = loras[i].civitai.trainedWords
      metadata.images = loras[i].civitai.images ?? []
      metadata.model_id = loras[i].civitai.modelId
      metadata.version_id = loras[i].civitai.id
      loras[i].metadata = metadata
      continue
    }
    if (loras[i].forge !== undefined) {
      // TODO: Provide metadata from Forge/Local Overrides as fallback?
    }

    // Final fallback in case we have nothing else
    metadata.name = loras[i].alias
    metadata.base_model = "Unknown"
    metadata.training_words = []
    loras[i].metadata = metadata
  }
  return loras
})

const selectLora = (lora) => {
  emit('loraSelected', lora.alias)
}

const closeOnEscape = (e) => {
  if (e.key === 'Escape') {
    emit('close')
  }
}

watch(() => props.show, (newVal) => {
  const modal = document.getElementById('lora_browser_modal')
  if (newVal) {
    modal.showModal()
    console.debug("Showing Lora Browser")
  } else {
    modal.close()
    console.debug("Hiding Lora Browser")
  }
})

</script>

<template>
  <dialog id="lora_browser_modal" class="modal" :onkeydown="closeOnEscape">
    <div class="modal-box w-11/12 max-w-5xl">
      <h3 class="font-bold text-lg">LoRA Browser</h3>
      <div class="py-4">
        <div class="flex gap-4 mb-4">
          <input type="text" placeholder="Search..." class="input input-bordered w-full" v-model="searchQuery" />
          <select class="select select-bordered" v-model="selectedBaseModel">
            <option v-for="model in baseModels" :key="model" :value="model">{{ model === 'all' ? 'All Models' : model }}</option>
          </select>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" style="max-height: 60vh; overflow-y: auto;">
          <LoraBrowserCard v-for="lora in filteredLoras" :key="lora.forge.path" :lora="lora" @click="selectLora(lora)" />
        </div>
      </div>
      <div class="modal-action">
        <form method="dialog">
          <button class="btn" @click="$emit('close')">Close</button>
        </form>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.modal-box {
  background-color: #2a323c;
}
</style>
