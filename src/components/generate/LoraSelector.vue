<script setup>
import {onMounted, ref} from "vue";
import {getAvailableLoras} from "@/services/NavigatorService";
import LoraSelectionCard from "@/components/generate/LoraSelectionCard.vue";

const props = defineProps(['disabled', 'prompt', 'negativePrompt'])
const emit = defineEmits(['onWordClicked', 'loraUpdated'])
const isExpanded = ref(false)
const lorasFromServer = ref([])
const availableLoras = ref([])
const enabledLoras = ref([])
const loraToAdd = ref("-1")
const splitTrainingWords = ref(true)
const mutateNegativePrompt = ref(false)

onMounted(async () => {
  let loras = await getAvailableLoras()
  console.log("Fetched loras from Navigator", loras.data)
  if(loras.data.length > 0) {
    availableLoras.value = loras.data
    lorasFromServer.value = loras.data
    console.log("Available loras", loras.data)
  } else {
    console.error("No loras found")
  }
})

const onWordClicked = (word) => {
  emit("onWordClicked", word, mutateNegativePrompt.value)
}

const onLoraSelected = (loraId) => {
  console.log("Lora selected", loraId)
  // noinspection JSUnresolvedReference
  enabledLoras.value.push(availableLoras.value.find(l => l.alias === loraId))
  availableLoras.value = availableLoras.value.filter(l => l.alias !== loraId)
  loraToAdd.value = "-1"
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
  enabledLoras.value = enabledLoras.value.filter(l => l.alias !== loraAlias)
  // Re-add back to available Loras list
  availableLoras.value = [...availableLoras.value, ...lorasFromServer.value.filter(l => l.alias === loraAlias)]
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

const getLoraPromptString = () => {
  let promptStr = ""
  for(let lora of enabledLoras.value) {
    promptStr += `<lora:${lora.alias}:${lora.strength || 0.8}> `
  }
  return promptStr
}
</script>

<template>
  <div v-if="lorasFromServer.length > 0" class="border border-opacity-50 rounded-md border-gray-500 p-2">
    <span v-if="!isExpanded" class="text-sm" @click="isExpanded = !isExpanded">LoRA Selection (Click to Expand)</span>
    <span v-else @click="isExpanded = !isExpanded">LoRA Selection</span>
    <div class="mt-2" v-show="isExpanded">
      <div class="grid grid-cols-12 gap-4 w-full">
        <select :disabled="disabled" class="select select-primary col-span-8" v-model="loraToAdd" :value="loraToAdd" @change="onLoraSelected($event.target.value)">
          <option disabled value="-1">Select a LoRA to enable</option>
          <option v-for="lora in availableLoras" :key="lora.alias" :value="lora.alias">{{lora.civitai.model.name || lora.name}}</option>
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