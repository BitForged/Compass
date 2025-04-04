<script setup>
import {computed, onMounted, ref} from "vue";

const props = defineProps(['lora', 'splitTrainingWords', 'prompt', 'negativePrompt', 'strength', 'disabled'])

const emit = defineEmits(['removed', 'onWordClicked', 'strengthChanged'])

const strength = ref(props.strength || 0.8)

const onLoraWordClicked = (word) => {
  if(props.disabled) {
    return;
  }
  console.log("Word clicked", word)
  emit('onWordClicked', word)
}

const hasConflictingWords = computed(() => {
  return processedTrainingWords.value.some(item => item.classes["badge-warning"] === true);
})

const processedTrainingWords = computed(() => {
  const words = [];
  let modelTrainedWords = [];
  if (props.lora && props.lora.civitai) {
    modelTrainedWords = props.lora.civitai.trainedWords
  } else if (props.lora && props.lora.localOverride && props.lora.localOverride.trainedWords) {
    modelTrainedWords = props.lora.localOverride.trainedWords
  }
  for (let idx = 0; idx < modelTrainedWords.length; idx++) {
    const trigger = modelTrainedWords[idx];
    if (props.splitTrainingWords === false) {
      // Handle unsplit words (no modifications on our side)
      // Add CSS classes to give the user a hint as to where the word/phrase is at
      // (Unless the component is disabled, then leave off the classes so it falls back to "neutral" as a hint to the user)
      let classes = {};
      if (!props.disabled) {
        classes = {
          "badge-success": props.prompt.includes(trigger) && !props.negativePrompt.includes(trigger),
          "badge-error": props.negativePrompt.includes(trigger) && !props.prompt.includes(trigger),
          "badge-warning": props.prompt.includes(trigger) && props.negativePrompt.includes(trigger),
        };
      }
      words.push({ word: trigger, classes });
    } else {
      // Attempt to iterate through each training word under trainedWords and split by `,` if enabled
      trigger
          .split(',')
          .map((word) => word.trim()) // Trim leading and trailing spaces for each word
          .forEach((word) => {
            // Add CSS classes to give the user a hint as to where the word/phrase is at
            let classes = {}
            if(!props.disabled) {
              classes = {
                "badge-success": props.prompt.includes(word) && !props.negativePrompt.includes(word),
                "badge-error": props.negativePrompt.includes(word) && !props.prompt.includes(word),
                "badge-warning": props.prompt.includes(word) && props.negativePrompt.includes(word),
              }
            }
            words.push({ word, classes });
          });
    }
  }
  return words;
})

onMounted(() => {
})
</script>

<template>
<div v-if="lora" class="card card-compact card-bg-dark text-neutral-content drop-shadow-lg h-full">
  <div class="card-body items-center text-center">
    <div class="header grid grid-cols-12 gap-2">
      <p v-if="!disabled" class="text-lg col-span-10"><span v-if="lora.nsfw" class="badge badge-error badge-sm align-middle">NSFW</span>
        {{lora.civitai?.model.name || lora.localOverride?.name || lora.alias}} <span class="col-span-2 align-middle cursor-pointer" @click="emit('removed')"> ❌</span>
      </p>
      <p v-else class="text-lg col-span-10"><span v-if="lora.nsfw" class="badge badge-error badge-sm align-middle">NSFW</span>
        {{lora.civitai?.model.name || lora.localOverride?.name || lora.alias}}
      </p>
    </div>
    <p v-if="lora.localOverride" class="text-sm">{{lora.civitai?.model.description || lora.localOverride?.description}}</p>
    <div class="flex flex-wrap gap-2 mt-2">
      <span v-if="lora.civitai !== undefined && lora.civitai.baseModel !== undefined" class="text-sm italic badge badge-accent">{{lora.civitai.baseModel}}</span>
      <span v-else-if="lora.localOverride !== undefined && lora.localOverride.baseModel !== undefined" class="text-sm italic badge badge-accent">{{lora.localOverride.baseModel}}</span>
      <span v-else class="text-sm italic badge badge-error">Unknown Model Type</span>
      <span v-if="lora.localOverride !== undefined" class="text-sm italic badge badge-warning">Local To This Instance</span>
    </div>
    <input :disabled="disabled" type="range" class="range range-sm" :class="{'range-primary': !disabled, 'range-test': disabled}" id="strength" step="0.1" min="0.0" max="1.0" :value="strength" @change="strength = $event.target.value; emit('strengthChanged', strength)"/>
    <p class="text-sm">{{strength}}</p>
    <div class="card-actions h-fit">
      <p class="badge badge-outline badge-neutral cursor-pointer drop-shadow-lg text-pretty line-clamp-3" v-for="word in processedTrainingWords" :class="word.classes" @click="onLoraWordClicked(word.word)">{{word.word}}</p>
      <p v-if="hasConflictingWords" class="text-sm text-warning">Warning: Your prompt contains at least one of these words/phrases in both the positive and negative prompt, this can cause unexpected results!</p>
    </div>
  </div>
</div>
</template>

<style scoped>
.card-bg-dark {
  /* background-color: #272a2d; */
  background-color: rgb(35, 36, 38);
}
</style>