<script setup>
import {onMounted, ref, toRaw} from "vue";
import {useSettingsStore} from "@/stores/settings";
import {useAlertStore} from "@/stores/alerts";

const settingsStore = useSettingsStore()
const alertStore = useAlertStore()
const predefinedPrompts = ref([])
const isAddingPrompt = ref(false)
const isImportingPrompt = ref(false)
const isDeletingAllPrompts = ref(false)

const importPromptFile = ref(null)

const deletingPromptId = ref(null)

const newPrompt = ref({
  id: null,
  name: "",
  prompt: "",
  negativePrompt: "",
})

const errorToast = ref(null)
const successToast = ref(null)
const infoToast = ref(null)

onMounted(() => {
  const prompts = settingsStore.getSetting("predefinedPrompts")
  predefinedPrompts.value = prompts || []
  console.debug("Predefined prompts:", toRaw(predefinedPrompts.value))
})

const pushErrorAlert = (message) => {
  alertStore.addAlert(message, "error")
}

const pushSuccessAlert = (message) => {
  alertStore.addAlert(message, "success")
}

const pushInfoAlert = (message) => {
  alertStore.addAlert(message, "info")
}

const addPrompt = () => {
  console.debug("Adding prompt")
  console.debug(toRaw(newPrompt.value))
  if(newPrompt.value.id !== null) {
    // Editing existing prompt
    const existingPrompt = predefinedPrompts.value.find((prompt) => {
      return prompt.id === newPrompt.value.id
    })
    if(existingPrompt) {
      existingPrompt.name = newPrompt.value.name
      existingPrompt.prompt = newPrompt.value.prompt
      existingPrompt.negativePrompt = newPrompt.value.negativePrompt
    }
    settingsStore.setSetting("predefinedPrompts", predefinedPrompts.value)
    isAddingPrompt.value = false
    newPrompt.value = {}
    return
  }
  newPrompt.value.id = crypto.randomUUID()
  predefinedPrompts.value.push(newPrompt.value)
  settingsStore.setSetting("predefinedPrompts", predefinedPrompts.value)
  isAddingPrompt.value = false
  newPrompt.value = {
    id: null,
    name: "",
    prompt: "",
    negativePrompt: "",
  }
}

const recreateFromPrompt = (prompt) => {
  console.debug("Recreating prompt")
  newPrompt.value = structuredClone(toRaw(prompt))
  console.debug(toRaw(newPrompt.value))
  isAddingPrompt.value = true
}

const deleteAllPrompts = () => {
  if(isDeletingAllPrompts.value) {
    predefinedPrompts.value = []
    settingsStore.setSetting("predefinedPrompts", predefinedPrompts.value)
    pushSuccessAlert("All prompts deleted!")
  } else {
    isDeletingAllPrompts.value = true
    setTimeout(() => {
      isDeletingAllPrompts.value = false
    }, 2500)
  }
}

const deletePrompt = (promptId) => {
  if(deletingPromptId.value === promptId) {
    console.debug("Deleting prompt", promptId)
    predefinedPrompts.value = predefinedPrompts.value.filter((prompt) => {
      return prompt.id !== promptId
    })
    settingsStore.setSetting("predefinedPrompts", predefinedPrompts.value)
  } else {
    deletingPromptId.value = promptId;
    setTimeout(() => {
      deletingPromptId.value = null;
    }, 2500)
  }
}

const setPromptImportFile = (event) => {
  console.debug("Processing prompt import file", event.target.files[0]);
  const reader = new FileReader();
  reader.onload = (e) => {
    if(e.type === "load") {
      const importedPromptText = e.target.result;
      console.debug("Found prompt import contents", importedPromptText);
      importPrompt(importedPromptText);
    } else {
      console.error("Failed to read prompt import file", e);
    }
  }

  reader.readAsText(event.target.files[0]);
}

const importPrompt = (contents) => {
  try {
    const importedPrompt = JSON.parse(contents)
    // Check if the imported contents are either an array (multiple prompts), or a single prompt
    if(Array.isArray(importedPrompt)) {
      console.debug("Importing multiple prompts")
      const newPrompts = []
      for (const prompt of importedPrompt) {
          if(prompt.prompt && prompt.negativePrompt) {
            const newPrompt = {
              id: crypto.randomUUID(),
              name: prompt.name || "Imported Prompt",
              prompt: prompt.prompt,
              negativePrompt: prompt.negativePrompt,
            }
            newPrompts.push(newPrompt)
          } else {
            console.error("Failed to parse prompt (invalid syntax)", prompt);
            pushErrorAlert("Failed to parse prompt, your file might not be properly formatted.")
            return
          }
      }
      predefinedPrompts.value.push(...newPrompts)
      settingsStore.setSetting("predefinedPrompts", predefinedPrompts.value)
      console.debug("Imported prompts", newPrompts)
      pushSuccessAlert("Imported prompts successfully!")
      isImportingPrompt.value = false // After importing a mass amount of prompts, they likely won't need to import more
      return
    }
    if(importedPrompt.prompt && importedPrompt.negativePrompt) {
      const newPrompt = {
        id: crypto.randomUUID(),
        name: importedPrompt.name || "Imported Prompt",
        prompt: importedPrompt.prompt,
        negativePrompt: importedPrompt.negativePrompt,
      }
      predefinedPrompts.value.push(newPrompt)
      settingsStore.setSetting("predefinedPrompts", predefinedPrompts.value)
      console.debug(
          "Imported prompt",
          newPrompt.prompt,
          newPrompt.negativePrompt,
      )
      pushSuccessAlert("Imported prompt successfully!")
    } else {
      console.error("Failed to parse prompt input (invalid syntax)", importedPrompt);
      pushErrorAlert("Failed to parse prompt, your file might not be properly formatted.")
    }
  } catch(e) {
    console.error("Failed to parse prompt import", e);
    pushErrorAlert("Failed to parse prompt import, your file might not be properly formatted.")
  }
}

const exportPrompt = (promptId) => {
  const promptExported = predefinedPrompts.value.find((prompt) => {
    return prompt.id === promptId
  })
  if(promptExported) {
    const promptText = JSON.stringify(promptExported)
    const blob = new Blob([promptText], {type: "text/plain;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = promptExported.name + ".json";
    link.click();
    URL.revokeObjectURL(url);
    pushInfoAlert("Exported prompt!")
  }
}

const exportAllPrompts = () => {
  const promptText = JSON.stringify(predefinedPrompts.value)
  const blob = new Blob([promptText], {type: "text/plain;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "predefined_prompts.json";
  link.click();
  URL.revokeObjectURL(url);
  pushInfoAlert("Exported all prompts!")
}

</script>

<template>
  <div v-if="errorToast !== null" class="toast z-20 w-fit">
    <div class="alert alert-error text-wrap">
      <span>{{errorToast}}</span>
    </div>
  </div>
  <div v-if="successToast !== null" class="toast z-20 w-fit">
    <div class="alert alert-success text-wrap">
      <span>{{successToast}}</span>
    </div>
  </div>
  <div v-if="infoToast !== null" class="toast z-20 w-fit">
    <div class="alert alert-info text-wrap">
      <span>{{infoToast}}</span>
    </div>
  </div>
  <div class="explanation">
    <h1>Predefined Prompts</h1>
    <p>
      This section will let you save prompts that can be inserted when generating an image. This can be great if you're
      using models that require score tags for example, or for setting up another common prompt for a specific model.
    </p>
    <p>
      Additionally, they can be used to set up a type of scene that you want to generate, or to set up a specific
      style of image.
    </p>
  </div>
  <div class="add-prompt-container flex items-center p-5">
    <div class="grid w-full gap-4 md:grid-cols-12">
      <div class="md:row md:col-span-10 max-sm:grid">
        <button class="btn btn-success ml-auto mr-auto max-sm:w-fit" @click="isAddingPrompt = true" v-show="isAddingPrompt === false">Add Prompt</button>
        <button class="btn btn-accent md:ml-3 ml-auto mr-auto max-sm:mt-1 max-sm:w-fit" @click="isImportingPrompt = !isImportingPrompt">Import Prompt</button>
        <button class="btn btn-info md:ml-3 ml-auto mr-auto max-sm:mt-1 max-sm:w-fit" @click="exportAllPrompts">Export All</button>
        <button v-if="!isDeletingAllPrompts" class="btn btn-error ml-auto md:ml-3 max-sm:mt-1 mr-auto max-sm:w-fit" @click="deleteAllPrompts">Clear ALL</button>
        <button v-else class="btn btn-error ml-3 mr-auto text-white" @click="deleteAllPrompts">Click to Confirm</button>
      </div>
      <div class="row md:col-span-10 md:m-2" v-if="isImportingPrompt">
        <input v-on:change="setPromptImportFile" type="file" class="file-input file-input-bordered file-input-primary w-full max-w-xs" /><br/>
        <button class="m-2 btn btn-error ml-1 mr-auto" @click="importPromptFile = null; isImportingPrompt = false">Cancel</button>
      </div>
      <div class="row md:col-span-10 md:pl-5" v-show="isAddingPrompt">
        <div class="row">
          <span v-if="newPrompt.id !== null" class="text-sm text-amber-500">Warning: Editing existing prompt!</span>
          <label for="prompt_name" class="label">Prompt Name</label>
          <input v-model="newPrompt.name" class="input input-bordered w-full" id="prompt_name" type="text" placeholder="Enter a name for your prompt"/>
          <label for="positive_prompt" class="label">Positive Prompt</label>
          <textarea v-model="newPrompt.prompt" id="positive_prompt" class="textarea textarea-bordered w-full" type="text" placeholder="Enter your prompt here!"/>
          <label for="negative_prompt" class="label">Negative Prompt</label>
          <textarea v-model="newPrompt.negativePrompt" id="negative_prompt" class="textarea textarea-bordered w-full" type="text" placeholder="Enter your prompt here!"/>
        </div>
        <div class="row mt-3">
          <button class="btn btn-error ml-auto mr-auto" @click="isAddingPrompt = false; newPrompt.id = null">Cancel</button>
          <button class="btn btn-success ml-4" @click="addPrompt">Save</button>
        </div>
      </div>
    </div>
  </div>
  <div class="predefined-prompts">
    <h1 class="text-lg text-center mb-3">Saved Prompts</h1>
    <p v-if="predefinedPrompts.length === 0" class="w-full ml-auto mr-auto text-center italic text-zinc-400">You do not currently have any prompts saved. Start by adding one up above!</p>
    <div v-if="predefinedPrompts.length > 0" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div v-for="prompt in predefinedPrompts" :key="prompt.id" class="card shadow-xl prompt-card">
        <div class="card-body">
          <h2 class="card-title">{{prompt.name}}</h2>
          <p>{{prompt.prompt}}</p>
          <p class="text-sm">{{prompt.negativePrompt}}</p>
          <div class="card-actions mt-2">
            <button v-if="deletingPromptId !== prompt.id" class="btn btn-error" @click="deletePrompt(prompt.id)">Delete</button>
            <button v-else class="btn btn-error text-white" @click="deletePrompt(prompt.id)">Click to Confirm</button>
            <button class="btn btn-info" @click="recreateFromPrompt(prompt)">Edit</button>
            <button class="btn btn-accent" @click="exportPrompt(prompt.id)">Export</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>

.explanation > h1 {
  font-size: 1.5rem;
  margin-bottom: 10px;
  margin-top: 0;
  font-weight: 500;
  color: #fff;
  text-align: center;
  width: 100%;
}

.explanation > p {
  color: #fff;
  width: 100%;
  margin-bottom: 10px;
  margin-top: 0;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  text-align: justify;
  text-justify: inter-word;
  text-align-last: center;
}

.prompt-card {
  background-color: hsl(24.7,1%,33.1%);
}

hr {
  border-color: #494646;
}
</style>