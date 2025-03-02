<script setup>
import {onMounted, ref} from "vue";
import {getAvailableLoras} from "@/services/NavigatorService";
import LoraSelectionCard from "@/components/generate/LoraSelectionCard.vue";

const props = defineProps(['disabled', 'prompt', 'negativePrompt'])
const emit = defineEmits(['onWordClicked', 'loraUpdated', 'lorasResolved'])
const isExpanded = ref(false)
const lorasFromServer = ref([])
const availableLoras = ref([])
const enabledLoras = ref([])
const loraToAdd = ref("-1")
const splitTrainingWords = ref(true)
const mutateNegativePrompt = ref(false)

onMounted(async () => {
  await updateAvailableLoras()
})

const updateAvailableLoras = async () => {
  if(availableLoras.value.length > 0) {
    console.log("Skipping update, already have available loras")
    emit("lorasResolved")
    return;
  }
  try {
    let loras = await getAvailableLoras()
    console.log("Fetched loras from Navigator", loras.data)
    if(loras.data.length > 0) {
      availableLoras.value = loras.data
      lorasFromServer.value = loras.data
      console.log("Available loras", loras.data)
    }
  } catch (e) {
    console.error("Failed to fetch loras from Navigator", e)
    emit("lorasResolved")
    return;
  }
  emit("lorasResolved")
}

const onWordClicked = (word) => {
  emit("onWordClicked", word, mutateNegativePrompt.value)
}

const onLoraSelected = (loraId) => {
  console.log("Lora selected", loraId)
  loraToAdd.value = "-1"
  activateLora(loraId)
  emit("loraUpdated", getLoraPromptString())
}

const onResetSelection = () => {
  availableLoras.value = lorasFromServer.value
  enabledLoras.value = []
  loraToAdd.value = "-1"
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
  const foundLora = availableLoras.value.find(l => l.alias === loraAlias)
  if(foundLora === undefined) {
    console.warn("Failed to find lora, skipping", loraAlias)
    return
  }
  // Check for duplicates
  if(enabledLoras.value.find(l => l.alias === loraAlias)) {
    console.warn("Lora already enabled, skipping", loraAlias)
    return
  }
  enabledLoras.value.push(foundLora)
  availableLoras.value = availableLoras.value.filter(l => l.alias !== loraAlias)
  onLoraStrengthChanged(loraAlias, strength)
}

const deactivateLora = (loraAlias) => {
  enabledLoras.value = enabledLoras.value.filter(l => l.alias !== loraAlias)
  // Re-add back to available Loras list
  availableLoras.value = [...availableLoras.value, ...lorasFromServer.value.filter(l => l.alias === loraAlias)]
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
    const strength = match[2]
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

defineExpose({
  forceActivateLoraFromPrompt
})
</script>

<template>
  <div v-if="lorasFromServer.length > 0" class="border border-opacity-50 rounded-md border-gray-500 p-2">
    <span v-if="!isExpanded" class="text-sm" @click="isExpanded = !isExpanded">LoRA Selection (Click to Expand)</span>
    <span v-else @click="isExpanded = !isExpanded">LoRA Selection</span>
    <div class="mt-2" v-show="isExpanded">
      <div class="grid grid-cols-12 gap-4 w-full">
        <select :disabled="disabled" class="select select-primary col-span-8" v-model="loraToAdd" :value="loraToAdd" @change="onLoraSelected($event.target.value)">
          <option disabled value="-1">Select a LoRA to enable</option>
          <option v-for="lora in availableLoras" :key="lora.alias" :value="lora.alias">[{{lora.civitai.baseModel || "?"}}] {{lora.civitai.model.name || lora.name}}</option>
        </select>
        <button :disabled="disabled" class="btn btn-error col-span-4" @click="onResetSelection">Reset Selection</button>
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
  </div>
</template>

<style scoped>

</style>