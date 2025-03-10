<script setup>
import {computed, nextTick, onMounted, ref, toRaw, watch} from "vue";
import {OhVueIcon} from "oh-vue-icons";
import {useSettingsStore} from "@/stores/settings";
import {getAvailableUpscalers} from "@/services/NavigatorService";

const settings = useSettingsStore()

const explainUpscaleSteps = ref(false)
const explainUpscaleSimilarity = ref(false)
const explainUpscalerSelection = ref(false)

const upscaleSettings = ref({
  steps: -1,
  denoisingStrength: -1,
  upscaler: "DEFAULT",
})

const upscalerOptions = ref([])

const generalSettings = ref({
  shareToCivitAI: false,
})

watch(() => upscaleSettings.value.steps, (value, oldValue) => {
  if(value !== oldValue) {
    console.debug("Upscale steps changed:", value)
    // Force setting to an Integer
    upscaleSettings.value.steps = parseInt(value)
    settings.setSetting("upscaleSteps", upscaleSettings.value.steps)
  }
})

watch(() => upscaleSettings.value.denoisingStrength, (value, oldValue) => {
  if(value !== oldValue) {
    console.debug("Upscale denoising strength changed:", value)
    // Force setting to an Integer
    upscaleSettings.value.denoisingStrength = parseFloat(value)
    settings.setSetting("upscaleDenoisingStrength", upscaleSettings.value.denoisingStrength)
  }
})

watch(() => upscaleSettings.value.upscaler, (value, oldValue) => {
  if(value !== oldValue) {
    console.debug("Upscaler changed:", value)
    if(value === "DEFAULT") {
      settings.deleteSetting("upscaler")
    } else {
      settings.setSetting("upscaler", value)
    }
  }
})

watch(() => generalSettings.value.shareToCivitAI, (value) => {
  settings.setSetting("shareToCivitAI", value)
  console.debug("Share to CivitAI changed:", value)
})

watch(() => explainUpscaleSteps.value, (value) => {
  toggleBodyScroll(value)
})

watch(() => explainUpscaleSimilarity.value, (value) => {
  toggleBodyScroll(value)
})

watch(() => explainUpscalerSelection.value, (value) => {
  toggleBodyScroll(value)
})

const toggleBodyScroll = (disable) => {
  if(disable) {
    document.body.classList.add("no-scroll");
  } else {
    document.body.classList.remove("no-scroll");
  }
};

const currentUpscaler = computed(() => {
  return upscalerOptions.value.find(option => option.name === upscaleSettings.value.upscaler)
});

onMounted(() => {
  nextTick(() => {
    // Find all section elements, and add in related classes
    document.querySelectorAll('.setting').forEach(el => {
      el.classList.add('rounded-lg', 'drop-shadow-lg')
    })
  })

  // Initialize settings
  upscaleSettings.value.steps = settings.getSetting("upscaleSteps") || -1
  upscaleSettings.value.denoisingStrength = settings.getSetting("upscaleDenoisingStrength") || -1
  generalSettings.value.shareToCivitAI = settings.getSetting("shareToCivitAI") || false

  // Populate upscaler options
  getAvailableUpscalers().then(upscalers => {
    upscalerOptions.value = upscalers.data
    console.debug("Upscaler options:", toRaw(upscalerOptions.value))
  })

  // Initialize upscaler selection setting
  //  This needs to be done *after* we've retrieved the list of upscalers, or else bad things may happen!
  upscaleSettings.value.upscaler = settings.getSetting("upscaler") || "DEFAULT"
})
</script>

<template>
  <div class="explanation">
    <h1>Image Generation</h1>
    <p>The following settings will allow you to adjust various settings that will take place when generating an image!</p>
    <p>Don't worry, each setting will have an explanation as to what it does, and what effects it may have.</p>
    <p class="text-gray-500 text-center italic subtle">Any setting changes you make are saved instantly, and do not require any "Save" button presses!</p>
  </div>
  <hr/>
  <div class="section">
    <div class="heading">
      Upscale Settings
    </div>
    <div class="settings lg:grid lg:grid-cols-3 gap-2">
      <div class="setting">
        <div class="setting-title">
          # of Upscale Steps
          <oh-vue-icon @click="explainUpscaleSteps = true" name="hi-information-circle" class="ml-2"/>
        </div>
        <div>
          <label class="label w-fit">
            <input v-model="upscaleSettings.steps" type="radio" class="radio radio-primary" id="upscale-same-as-job" name="upscale-steps" value="-1" />
            <span class="label-text ms-2 float-start">Same as Original Job (Default)</span>
          </label>
        </div>
        <div>
          <label class="label w-fit">
            <input @click="upscaleSettings.steps = 10" :checked="upscaleSettings.steps !== -1" type="radio" class="radio radio-primary" id="upscale-custom" name="upscale-steps" value="10" />
            <span class="label-text ms-2 float-start">Custom Value</span>
          </label>
        </div>
        <div v-if="upscaleSettings.steps !== -1" class="form-control row-auto">
          <input v-model="upscaleSettings.steps" value="10" max="75" min="5" type="number" class="input input-bordered w-full" placeholder="Enter a number"/>
        </div>
      </div>
      <div class="setting">
        <div class="setting-title">
          Upscale Similarity
          <oh-vue-icon @click="explainUpscaleSimilarity = true" name="hi-information-circle" class="ml-2"/>
        </div>
        <label class="label w-fit">
          <input v-model="upscaleSettings.denoisingStrength" type="radio" class="radio radio-primary" id="upscale-similarity-default" name="upscale-similarity" value="-1" />
          <span class="label-text ms-2 float-start">Use Recommended Default</span>
        </label>
        <label class="label w-fit">
          <input @click="upscaleSettings.denoisingStrength = 0.35" type="radio" class="radio radio-primary" :checked="upscaleSettings.denoisingStrength !== -1" id="upscale-similarity-custom" name="upscale-similarity" />
          <span v-if="upscaleSettings.denoisingStrength === -1" class="label-text ms-2 float-start">Custom Value</span>
          <span v-else class="label-text ms-2 float-start">Custom Value ({{upscaleSettings.denoisingStrength}})</span>
        </label>
        <div v-if="upscaleSettings.denoisingStrength !== -1" class="form-control row-auto">
          <input v-model="upscaleSettings.denoisingStrength" type="range" max="1.0" min="0.0" step="0.05" class="range range-primary" />
        </div>
        <span v-if="upscaleSettings.denoisingStrength === 0.0 || upscaleSettings.denoisingStrength === 1" class="text-warning text-sm">
          The setting you have selected is recommended against as it may cause issues with upscaling.
        </span>
      </div>
      <div class="setting">
        <div class="setting-title">
          Upscaler Selection
          <oh-vue-icon @click="explainUpscalerSelection = true" name="hi-information-circle" class="ml-2"/>
        </div>
        <label class="label w-fit">
          <input v-model="upscaleSettings.upscaler" type="radio" class="radio radio-primary" id="upscaler-default" name="upscaler-selection" value="DEFAULT" />
          <span class="label-text ms-2 float-start">Use Recommended Default</span>
        </label>
        <label class="label w-fit">
          <input @click="upscaleSettings.upscaler = upscalerOptions[0].name" type="radio" class="radio radio-primary" id="upscaler-custom" name="upscaler-selection" :checked="upscaleSettings.upscaler !== 'DEFAULT'" />
          <span class="label-text ms-2 float-start">Custom Value</span>
        </label>
        <div v-if="upscaleSettings.upscaler !== 'DEFAULT'" class="form-control row-auto">
          <select v-model="upscaleSettings.upscaler" class="select select-bordered w-full">
            <option v-for="option in upscalerOptions" :key="option.name" :value="option.name">{{option.name}}</option>
          </select>
        </div>
        <div v-if="upscaleSettings.upscaler !== 'DEFAULT' && currentUpscaler !== undefined" class="form-control row-auto">
          <span class="text-success">This upscaler is great for upscaling up to x{{currentUpscaler.scale}}!</span>
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="heading">
      General Settings
    </div>
    <div class="settings lg:grid lg:grid-cols-3 gap-2">
      <div class="setting">
        <div class="setting-title">
          Share to CivitAI Button
        </div>
        <label class="label w-fit">
          <input @click="generalSettings.shareToCivitAI = false" type="radio" class="radio radio-primary" id="add-share-to-civitai" name="add-share-to-civitai" value="false" :checked="generalSettings.shareToCivitAI === false" />
          <span class="label-text ms-2 float-start">Disabled</span>
        </label>
        <label class="label w-fit">
          <input @click="generalSettings.shareToCivitAI = true" type="radio" class="radio radio-primary" id="add-share-to-civitai" name="add-share-to-civitai" value="true" :checked="generalSettings.shareToCivitAI" />
          <span class="label-text ms-2 float-start">Enabled</span>
        </label>
      </div>
    </div>
  </div>

  <!-- Modal dialogs for setting explanations -->
  <div v-if="explainUpscaleSteps" class="setting-explanation fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
    <div class="modal-content bg-neutral-700 p-5 rounded-lg w-5/6 md:w-3/4 lg:w-1/2 mx-4">
      <h2 class="text-center text-xl font-bold mb-4">Upscale Steps</h2>
      <p>When upscaling an image, by default the AI will make the same amount of passes ("steps") on the image as the original image took to generate.</p>
      <p>However, not all images or AI models are created equally &mdash; in some cases, too many upscale passes can cause an image to degrade (such as loss of details/saturation, oversharpening, etc).</p>
      <p>You can set this to a lower value to attempt to prevent this, however we'll never perform more "steps" than the original image took to generate, if the value you pick is over that, it will stop at the original step count.</p>
      <p>Leaving this at the default means the number of upscaling steps will be the same as the amount of original generation steps.</p>
      <button @click="explainUpscaleSteps = false" class="btn btn-primary mt-2 float-end">Close</button>
    </div>
  </div>
  <div v-if="explainUpscaleSimilarity" class="setting-explanation fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
    <div class="modal-content bg-neutral-700 p-5 rounded-lg w-5/6 md:w-3/4 lg:w-1/2 mx-4">
      <h2 class="text-center text-xl font-bold mb-4">Upscale Similarity</h2>
      <p>When upscaling an image, the AI can try to "correct" problems that might be in the original base image. This process is known as "High-Resolution Fix(ing)" - or "HRF".</p>
      <p>This process is important, as most models are only trained on very specific image resolutions, and deviating from it can cause artifacts in the resulting image.</p>
      <p>Some of these artifacts can also just simply be caused by the fact that the base image has a low resolution (such as "grain" in the image).</p>
      <br/>
      <p>To put the process very simply, the HRF process takes the original image, then uses a similar technique as Img2Img to create a new image derived from the base/original image.</p>
      <p>This setting controls how much of the original image can the AI "see" or use as part of the HRF process. It is a decimal value, between 0 and 1.</p>
      <p>A value of 0 means that the AI will "see" all of the original image, and will effectively replicate the entire original image - including any artifacts that might be present.</p>
      <p>A value of 1 means that the AI will "see" <strong>NONE</strong> of the original image, and will effectively generate <em>an entirely new image completely, and unrelated to the original</em>.</p>
      <br/>
      <p>You probably want a value closer to 0, and this application uses 0.35 by default. This allows for the AI to use most of the original image as part of the upscaling, but also gives it just a little bit of freedom to make corrections.</p>
      <br/>
      <p>The technical name of this value being passed into the HRF process is the "Denoising Strength" value.</p>
      <button @click="explainUpscaleSimilarity = false" class="btn btn-primary mt-2 float-end">Close</button>
    </div>
  </div>
  <div v-if="explainUpscalerSelection" class="setting-explanation fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
    <div class="modal-content bg-neutral-700 p-5 rounded-lg w-5/6 md:w-3/4 lg:w-1/2 mx-4">
      <h2 class="text-center text-xl font-bold mb-4">Upscaler Selection</h2>
      <p>When upscaling, there are multiple upscalers that can be utilized - similar to how there are multiple models that can be used to generate an image.</p>
      <p>Each upscaler has its own strengths and weaknesses, just as image models do. By default, we try to ensure that a general-purpose upscaler is used so that you're not required to make a selection each time you perform an upscale.</p>
      <p>However, should you wish to utilize a different one, you have the option to do so! Unfortunately its not possible for us to easily explain the pros and cons of each upscaler, so you'll need to look this up on your own.</p>
      <button @click="explainUpscalerSelection = false" class="btn btn-primary mt-2 float-end">Close</button>
    </div>
  </div>
</template>

<style scoped>
hr {
  border: 1px solid #272a2d;
  margin: 10px 0;
}

.heading {
  font-size: 1.3rem;
  margin-bottom: 10px;
  margin-top: 0;
  font-weight: 500;
  color: #fff;
  text-align: center;
  width: 100%;
}

.setting {
  margin-bottom: 20px;
  margin-top: 20px;
  padding: 10px;
  color: #fff;
  background-color: #383535;
  text-align: center;
}

.setting-title {
  font-size: 1.1rem;
  font-weight: 500;
  margin-bottom: 5px;
  margin-top: 0;
  text-align: center;
  width: 100%;
  color: #fff;
  text-transform: uppercase;
  text-align-last: center;
}

.modal-content {
  max-height: 80vh;
  overflow-y: auto;
}
</style>