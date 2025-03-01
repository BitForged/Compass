<script setup>
import {computed, onMounted, ref} from "vue";

const props = defineProps(['lora', 'splitTrainingWords', 'prompt', 'negativePrompt'])

const emit = defineEmits(['removed', 'onWordClicked', 'strengthChanged'])

const strength = ref(0.8)

const onLoraWordClicked = (word) => {
  console.log("Word clicked", word)
  emit('onWordClicked', word)
}

const hasConflictingWords = computed(() => {
  return processedTrainingWords.value.some(item => item.classes["badge-warning"] === true);
})

const processedTrainingWords = computed(() => {
  const words = [];
  if (props.lora && props.lora.civitai) {
    for (let idx = 0; idx < props.lora.civitai.trainedWords.length; idx++) {
      const trigger = props.lora.civitai.trainedWords[idx];
      if (props.splitTrainingWords === false) {
        // Handle unsplit words (no modifications on our side)
        // Add CSS classes to give the user a hint as to where the word/phrase is at
        let classes = {
          "badge-success": props.prompt.includes(trigger) && !props.negativePrompt.includes(trigger),
          "badge-error": props.negativePrompt.includes(trigger) && !props.prompt.includes(trigger),
          "badge-warning": props.prompt.includes(trigger) && props.negativePrompt.includes(trigger),
        };
        words.push({ word: trigger, classes });
      } else {
        // Attempt to iterate through each training word under trainedWords and split by `,` if enabled
        trigger
            .split(',')
            .map((word) => word.trim()) // Trim leading and trailing spaces for each word
            .forEach((word) => {
              // Add CSS classes to give the user a hint as to where the word/phrase is at
              let classes = {
                "badge-success": props.prompt.includes(word) && !props.negativePrompt.includes(word),
                "badge-error": props.negativePrompt.includes(word) && !props.prompt.includes(word),
                "badge-warning": props.prompt.includes(word) && props.negativePrompt.includes(word),
              };
              words.push({ word, classes });
            });
      }
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
      <p class="text-lg col-span-10"><span v-if="lora.nsfw" class="badge badge-error badge-sm">NSFW</span>
        {{lora.civitai.model.name || lora.alias}} <span class="col-span-2 align-middle cursor-pointer" @click="emit('removed')"> ❌</span>
      </p>

    </div>
    <input type="range" class="range range-sm range-primary" id="strength" step="0.1" min="0.0" max="1.0" :value="strength" @change="strength = $event.target.value; emit('strengthChanged', strength)"/>
    <p class="text-sm">{{strength}}</p>
    <div class="card-actions h-fit">
      <p class="badge badge-outline badge-neutral cursor-pointer drop-shadow-lg text-pretty line-clamp-3 h-fit" v-for="word in processedTrainingWords" :class="word.classes" @click="onLoraWordClicked(word.word)">{{word.word}}</p>
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