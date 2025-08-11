<script setup lang="ts">
import {computed, onMounted, ref} from "vue";
import { getAvailableEmbeddings } from "@/services/NavigatorService"

export interface EmbeddingSelection {
  name: string,
  type: "off" | "positive" | "negative"
}

enum EmbeddingSelectionType {
  OFF = "off",
  POSITIVE = "positive",
  NEGATIVE = "negative"
}

const emit = defineEmits(["update:embeddings"])

const isExpanded = ref<boolean>(false)
const embeddings = ref<EmbeddingSelection[]>([])
const selectionTypes = [EmbeddingSelectionType.OFF, EmbeddingSelectionType.POSITIVE, EmbeddingSelectionType.NEGATIVE];

const cycleEmbeddingState = (embedding: EmbeddingSelection) => {
  const currentStateIndex = selectionTypes.indexOf(<EmbeddingSelectionType>embedding.type);
  const nextStateIndex = (currentStateIndex + 1) % selectionTypes.length;
  embedding.type = selectionTypes[nextStateIndex];
  emit("update:embeddings", embeddings.value)
}

const hasEnabledEmbedding = computed(() => {
  return embeddings.value.some(embedding => embedding.type === "positive" || embedding.type === "negative")
})

/**
 * This is triggered by the Generation page whenever a previous image is recalled. Since this will update the prompt,
 *  we need to make sure that the embeddings are re-enabled if they were previously enabled. After we've recalculated
 *  the embeddings, we'll emit the updated embeddings to the parent component.
 *  FIXME: This could end up being a race-condition if the parent component calls this before the available embeddings
 *   have been retrieved.
 * @param positivePrompt The new positive prompt
 * @param negativePrompt The new negative prompt
 */
const forceProcessEmbeddingTriggers = (positivePrompt: string, negativePrompt: string) => {
  let newEmbeddings: EmbeddingSelection[] = []
  console.log(`Forcing embedding processing with positive prompt: ${positivePrompt} and negative prompt: ${negativePrompt}. Available embeddings: ${embeddings.value.map(embedding => embedding.name).join(", ")}`)
  embeddings.value.forEach(embedding => {
    embedding.name = embedding.name.trim()
    if (embedding.name === "") {
      return
    }
    if (positivePrompt.includes(embedding.name)) {
      newEmbeddings.push({
        name: embedding.name,
        type: "positive"
      })
      console.log("Embedding found in positive prompt: ", embedding.name)
    } else if (negativePrompt.includes(embedding.name)) {
      newEmbeddings.push({
        name: embedding.name,
        type: "negative"
      })
      console.log("Embedding found in negative prompt: ", embedding.name)
    } else {
      newEmbeddings.push({
        name: embedding.name,
        type: "off"
      })
      console.log("Embedding not found in prompt: ", embedding.name)
    }
  })
  embeddings.value = newEmbeddings
  console.log("Forced embedding processing: ", newEmbeddings)
  emit("update:embeddings", embeddings.value)
  // If any embeddings were enabled (positive or negative), force expand the component
  if (newEmbeddings.some(embedding => embedding.type === "positive" || embedding.type === "negative")) {
    isExpanded.value = true
  }
}

const forceCollapse = () => {
  isExpanded.value = false
}

defineExpose({
  forceProcessEmbeddingTriggers,
  forceCollapse,
})

onMounted(async () => {
  console.log("Mounted, retrieving available embeddings from Navigator...")
  let res = await getAvailableEmbeddings()
  console.log("Retrieved embeddings: ", res.data)
  for (const embedding of res.data) {
    embeddings.value.push({
      name: embedding,
      type: "off"
    })
  }
})
</script>

<template>
  <div>
    <div v-if="embeddings.length > 0">
      <p v-if="!isExpanded" class="text-sm cursor-pointer" @click="isExpanded = !isExpanded">Embeddings (Click to Expand)</p>
      <p v-else class="text-lg cursor-pointer" @click="isExpanded = !isExpanded">Embeddings</p>
      <div v-if="isExpanded" class="flex flex-wrap gap-2 mt-2">
        <span v-for="embedding in embeddings"
              :key="embedding.name"
              @click="cycleEmbeddingState(embedding)"
              class="badge cursor-pointer select-none"
              :class="{
                'badge-outline': embedding.type === 'off',
                'badge-outline badge-success': embedding.type === 'positive',
                'badge-outline badge-error': embedding.type === 'negative'
              }">
          {{ embedding.name }}
        </span>
      </div>
      <p v-if="hasEnabledEmbedding" class="mt-2 text-sm text-gray-500">Any selected embeddings will automatically be added at the end of your prompt right before it is sent.</p>
      <p v-if="hasEnabledEmbedding" class="text-sm text-gray-500">"Green" embeddings will be added to the positive prompt, "Red" embeddings will be added to the negative prompt.</p>
    </div>
  </div>
</template>

<style scoped>

</style>