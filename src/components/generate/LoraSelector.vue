<script setup>
import {computed, onMounted, ref} from "vue";
import {getAvailableLoras} from "@/services/NavigatorService";
import LoraSelectionCard from "@/components/generate/LoraSelectionCard.vue";
import LoraBrowser from "@/components/generate/LoraBrowser.vue";
import {useAuthStore} from "@/stores/auth";

const props = defineProps(['disabled', 'prompt', 'negativePrompt'])
const emit = defineEmits(['onWordClicked', 'loraUpdated', 'lorasResolved', 'lorasRefreshing'])
const isRefreshing = ref(false)
const isExpanded = ref(false)
const lorasFromServer = ref([])
const availableLoras = ref([])
const enabledLoras = ref([])
const splitTrainingWords = ref(true)
const mutateNegativePrompt = ref(false)
const showLoraBrowser = ref(false)

onMounted(async () => {
  await updateAvailableLoras()
})

const canForceMetadataUpdate = computed(() => {
  return useAuthStore().role >= 3
})

const onForceUpdateMetadataBtnClicked = async () => {
  if(!canForceMetadataUpdate.value) {
    return;
  }
  await updateAvailableLoras(true, true)
}

const updateAvailableLoras = async (forcedRefresh = false, forcedMetadataUpdate = false) => {
  if(lorasFromServer.value.length > 0 && (!forcedRefresh && !forcedMetadataUpdate)) {
    console.log("Skipping update, already have available loras")
    emit("lorasResolved")
    return;
  }
  try {
    emit("lorasRefreshing")
    isRefreshing.value = true
    let loras = await getAvailableLoras(forcedMetadataUpdate)
    console.log("Fetched loras from Navigator", loras.data)
    if(loras.data.length > 0) {
      lorasFromServer.value = loras.data
      // Initially, all loras are available
      availableLoras.value = loras.data
      console.log("Available loras", loras.data)
    }
    isRefreshing.value = false
  } catch (e) {
    console.error("Failed to fetch loras from Navigator", e)
    emit("lorasResolved")
    isRefreshing.value = false
    return;
  }
  emit("lorasResolved")
}

const onWordClicked = (word) => {
  emit("onWordClicked", word, mutateNegativePrompt.value)
}

const onLoraSelectedFromBrowser = (loraAlias) => {
  console.log("Lora selected from browser", loraAlias)
  activateLora(loraAlias)
  emit("loraUpdated", getLoraPromptString())
  showLoraBrowser.value = false
}

const onResetSelection = () => {
  enabledLoras.value.forEach(lora => {
    if (!availableLoras.value.find(l => l.alias === lora.alias)) {
      availableLoras.value.push(lora)
    }
  })
  enabledLoras.value = []
  emit("loraUpdated", getLoraPromptString())
}

const onLoraRemoved = (loraAlias) => {
  console.log("Lora removed", loraAlias)
  deactivateLora(loraAlias)
  emit("loraUpdated", getLoraPromptString())
}

const onLoraStrengthChanged = (loraAlias, strength) => {
  console.log("Lora strength changed", loraAlias, strength)
  enabledLoras.value = enabledLoras.value.map(l => {
    if(l.alias === loraAlias) {
      l.strength = strength
    }
    return l
  })
  emit("loraUpdated", getLoraPromptString())
}

const activateLora = (loraAlias, strength = 0.8) => {
  // noinspection JSUnresolvedReference
  console.log("Activating lora", loraAlias, strength)
  const foundLora = lorasFromServer.value.find(l => l.alias === loraAlias)
  if(foundLora === undefined) {
    console.warn("Failed to find lora, skipping", loraAlias)
    return
  }
  // Check for duplicates
  if(enabledLoras.value.find(l => l.alias === loraAlias)) {
    console.warn("Lora already enabled, skipping", loraAlias)
    return
  }
  enabledLoras.value.push({...foundLora, strength: strength})
  availableLoras.value = availableLoras.value.filter(l => l.alias !== loraAlias)
}

const deactivateLora = (loraAlias) => {
  const foundLora = lorasFromServer.value.find(l => l.alias === loraAlias)
  enabledLoras.value = enabledLoras.value.filter(l => l.alias !== loraAlias)
  if (foundLora && !availableLoras.value.find(l => l.alias === loraAlias)) {
    availableLoras.value.push(foundLora)
  }
}

const getLoraPromptString = () => {
  let promptStr = ""
  for(let lora of enabledLoras.value) {
    promptStr += `<lora:${lora.alias}:${lora.strength || 0.8}> `
  }
  return promptStr
}

const forceActivateLoraFromPrompt = async (prompt) => {
  // Activated LoRAs will have the following syntax: `<lora:ALIAS_NAME:strength>` - parse these and then run `activateLora`
  await updateAvailableLoras()
  const regex = /<lora:([^:]+):([\d.]+)>/g
  let didFindLora = false
  let match
  while((match = regex.exec(prompt)) !== null) {
    const aliasName = match[1]
    const strength = parseFloat(match[2])
    console.log(`Found LoRA: ${aliasName} with strength ${strength}`)
    activateLora(aliasName, strength)
    didFindLora = true
  }

  if(didFindLora) {
    isExpanded.value = true
    emit("loraUpdated", getLoraPromptString())
  }
  console.log("Finished scanning prompt for loras from prompt -> ", prompt)
}

const forceCollapse = () => {
  isExpanded.value = false
}

defineExpose({
  forceActivateLoraFromPrompt,
  forceCollapse
})
</script>

<template>
  <div v-if="lorasFromServer.length > 0" class="rounded-md p-2">
    <span v-if="!isExpanded" class="text-sm cursor-pointer" @click="isExpanded = !isExpanded">LoRA Selection (Click to Expand)</span>
    <span v-else class="cursor-pointer" @click="isExpanded = !isExpanded">LoRA Selection</span>
    <div class="mt-2" v-show="isExpanded">
      <div class="grid grid-cols-12 gap-4 w-full">
        <button :disabled="disabled" class="btn btn-primary col-span-12 md:col-span-4" @click="showLoraBrowser = true">Browse LoRAs</button>
        <div v-if="canForceMetadataUpdate" class="grid grid-cols-12 gap-4 w-full col-span-12 md:col-span-8">
          <button :disabled="disabled || isRefreshing" class="btn btn-info col-span-6" @click="() => updateAvailableLoras(true, false)">Refresh LoRAs</button>
          <button :disabled="disabled || isRefreshing" class="btn btn-secondary col-span-6" @click="onForceUpdateMetadataBtnClicked">Force Update Metadata</button>
        </div>
        <div class="grid grid-cols-12 gap-4 w-full col-span-12 md:col-span-4" v-else>
          <button :disabled="disabled || isRefreshing" class="btn btn-info col-span-12 md:col-span-12" @click="() => updateAvailableLoras(true, false)">Refresh LoRAs</button>
        </div>
        <button :disabled="disabled" class="btn btn-error col-span-12 md:col-span-4" @click="onResetSelection">Reset Selection</button>
      </div>
      <div class="grid grid-cols-12 gap-4 w-full mt-3">
        <LoraSelectionCard class="col-span-12 xl:col-span-6" :class="{'md:col-span-6': enabledLoras.length > 1}" v-for="lora in enabledLoras" :key="lora.alias" :lora="lora"
                           :split-training-words="splitTrainingWords" :prompt="prompt" :negative-prompt="negativePrompt" :strength="lora.strength" :disabled="disabled"
                           @removed="onLoraRemoved(lora.alias)" @onWordClicked="onWordClicked" @strengthChanged="onLoraStrengthChanged(lora.alias, $event)"/>
      </div>
      <div class="w-full mt-3 flex items-center">
        <input v-model="splitTrainingWords" type="checkbox" class="checkbox checkbox-primary me-1" />
        <span class="text-sm">Further Split Training Words</span>
      </div>
      <div class="w-full mt-3 flex items-center">
        <input v-model="mutateNegativePrompt" type="checkbox" class="checkbox checkbox-primary me-1" />
        <span class="text-sm">Add/Remove From Negative Prompt</span>
      </div>
    </div>
    <LoraBrowser :available-loras="availableLoras" :enabled-loras="enabledLoras" :show="showLoraBrowser" @close="showLoraBrowser = false" @loraSelected="onLoraSelectedFromBrowser" />
  </div>
</template>

<style scoped>

</style>