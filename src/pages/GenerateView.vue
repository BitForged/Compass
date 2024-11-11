<script setup>
import {computed, inject, onMounted, onUnmounted, ref, watch} from "vue";
import { OhVueIcon } from "oh-vue-icons";
import {generateTxt2Img, getAvailableModels, getAvailableSamplers} from "@/services/NavigatorService";
import {useAlertStore} from "@/stores/alerts";
import SizePreviewBox from "@/components/SizePreviewBox.vue";

const imageParams = ref({
  width: 1024,
  height: 1024,
  options: {
    prompt: "",
    negative_prompt: "",
    model: {},
    sampler: {},
    steps: 50,
    cfg_scale: 7.0,
    seed: -1,
  },
});

const isWorking = ref(false);

const currentProgress = ref(null);

const maxProgress = ref(100);

const isInitialConnection = ref(true);

const progressText = ref("Nothing to report yet...");

const currentJobId = ref(null);

const progressClasses = computed(() => {
  if(currentProgress.value === null) {
    return {
    };
  }
  return {
    "progress-primary": currentProgress.value < 50,
    "progress-warning": currentProgress.value >= 50 && currentProgress.value < 75,
    "progress-error": currentProgress.value >= 75,
  };
});

const showTipsModal = ref(false);
const showAdvancedOptions = ref(false);
const availableModels = ref([]);
const availableSamplers = ref([]);

const navigatorRt = inject("$navigator_rt").socket;

const doesSizeRequireUpscale = computed(() => {
  return (imageParams.value.width * imageParams.value.height) > (1024 * 1024);
});

const doesSizeExceedLimit = computed(() => {
  return (imageParams.value.width * imageParams.value.height) > (2160 * 1440);
});

const isImageParamsValid = computed(() => {
  if(doesSizeExceedLimit.value) {
    return false;
  }
  if(imageParams.value.options.prompt.length < 1) {
    return false;
  }
  if(imageParams.value.options.model.model_name === undefined) {
    return false;
  }
  if((imageParams.value.options.cfg_scale < 0.1) || (imageParams.value.options.cfg_scale > 16.0)) {
    return false;
  }
  if((imageParams.value.options.steps < 1) || (imageParams.value.options.steps > 75)) {
    return false;
  }
  return typeof imageParams.value.options.seed === 'number';

});

const rangeColorClasses = computed(() => {
  if(doesSizeExceedLimit.value) {
    return {
      "range-error": true,
    };
  }
  return {
    "range-primary": !doesSizeRequireUpscale.value,
    "range-warning": doesSizeRequireUpscale.value,
  };
});

const validateImageSizeParams = () => {
  if (imageParams.value.width < 64) {
    imageParams.value.width = "64";
  }
  if (imageParams.value.height < 64) {
    imageParams.value.height = "64";
  }
};

const toggleBodyScroll = (disable) => {
  if(disable) {
    document.body.classList.add("no-scroll");
  } else {
    document.body.classList.remove("no-scroll");
  }
};

const initializeData = () => {
  let errored = false;
  getAvailableModels().then((resp) => {
    availableModels.value = resp.data.models;
    console.log("Fetched models from Navigator", resp.data.models);
    if(resp.data.models.length > 0){
      imageParams.value.options.model = resp.data.models[0];
    }
  }).catch((error) => {
    console.error("Failed to fetch models from Navigator", error);
    errored = true;
  });

  getAvailableSamplers().then((resp) => {
    availableSamplers.value = resp.data;
    console.log("Fetched samplers from Navigator", resp.data);
    if(resp.data.length > 0){
      imageParams.value.options.sampler = resp.data[0];
    }
  }).catch((error) => {
    console.error("Failed to fetch samplers from Navigator", error);
    errored = true;
  });

  if(errored) {
    useAlertStore().addAlert("Failed to fetch data from Navigator, some functionality may work unexpectedly!", "error");
  }
}

const sendJobToNavigator = () => {
  if(isImageParamsValid.value) {
    console.log("Sending job to Navigator", imageParams.value);
    isWorking.value = true;
    let job = {
      prompt: imageParams.value.options.prompt,
      negative_prompt: imageParams.value.options.negative_prompt,
      model_name: imageParams.value.options.model.model_name,
      sampler_name: imageParams.value.options.sampler.name,
      steps: imageParams.value.options.steps,
      width: imageParams.value.width,
      height: imageParams.value.height,
      cfg_scale: imageParams.value.cfg_scale,
    };
    generateTxt2Img(job).then((resp) => {
      console.log("Sent image request to Navigator", resp.data);
      currentJobId.value = resp.data.job_id;
      progressText.value = "Job queued, waiting for results...";
      // TODO: Handle queue status
    }).catch((error) => {
      console.error("Failed to generate image from Navigator", error);
      useAlertStore().addAlert("Failed to generate image from Navigator, please try again later!", "error");
      isWorking.value = false;
    });
  } else {
    console.error("Invalid image parameters, cannot send job to Navigator");
  }
};

const onJobProgress = (data) => {
  console.log(data);
  if(data.job_id === currentJobId.value) {
    currentProgress.value = data.current_step;
    maxProgress.value = data.total_steps;
    progressText.value = "Generating image... " + data.current_step + "/" + data.total_steps;
    document.getElementById("job-image").src = `${import.meta.env.VITE_API_BASE}${data.progress_path}?step=${data.current_step}`;
  }
};

const onJobFinished = (data) => {
  console.log(data);
  if(data.job_id === currentJobId.value) {
    currentProgress.value = null;
    progressText.value = "Job completed!";
    currentJobId.value = null;
    document.getElementById("job-image").src = `${import.meta.env.VITE_API_BASE}${data.img_path}`;
    isWorking.value = false;
    setTimeout(() => {
      progressText.value = "Nothing to report yet...";
    }, 3000);
  }
};

const onRemoteModelChanging = (data) => {
  console.log("Remote model changed", data);
  if(data.job_id === currentJobId.value) {
    progressText.value = "Model change in progress...";
    currentProgress.value = 0;
  }
}

const onDisconnect = () => {
  console.error("Navigator RT disconnected, attempting to reconnect...");
  useAlertStore().addAlert("Navigator RT disconnected, attempting to reconnect...", "error");
  navigatorRt.connect();
};

const onConnect = () => {
  if(isInitialConnection.value) {
    isInitialConnection.value = false;
    return;
  }
  console.log("Navigator RT reconnected!");
  useAlertStore().addAlert("Navigator RT reconnected!", "success");
};


watch(showTipsModal, (newValue) => {
  toggleBodyScroll(newValue);
});

watch(imageParams, (newValue) => {
  if(!isNaN(newValue.options.seed) && newValue.options.seed !== '') {
    imageParams.value.options.seed = Number(newValue.options.seed);
  } else {
    imageParams.value.options.seed = -1;
  }

  if(!isNaN(newValue.options.cfg_scale) && newValue.options.cfg_scale !== '') {
    imageParams.value.options.cfg_scale = Number(newValue.options.cfg_scale);
  } else {
    imageParams.value.options.cfg_scale = 7.0;
  }

  if(!isNaN(newValue.options.steps) && newValue.options.steps !== '') {
    imageParams.value.options.steps = Number(newValue.options.steps);
  } else {
    imageParams.value.options.steps = 50;
  }

  if(!isNaN(newValue.width) && newValue.width !== '') {
    imageParams.value.width = Number(newValue.width);
  } else {
    imageParams.value.width = 800;
  }

  if(!isNaN(newValue.height) && newValue.height !== '') {
    imageParams.value.height = Number(newValue.height);
  } else {
    imageParams.value.height = 600;
  }

}, {deep: true});

onMounted(() => {
  toggleBodyScroll(showTipsModal.value);
  initializeData();
  navigatorRt.on("task-progress", onJobProgress);
  navigatorRt.on("task-finished", onJobFinished);
  navigatorRt.on("model-changed", onRemoteModelChanging);
  navigatorRt.on("connect", onConnect);
  navigatorRt.on("disconnect", onDisconnect);
});

onUnmounted(() => {
  toggleBodyScroll(false);
  navigatorRt.off("task-progress", onJobProgress);
  navigatorRt.off("task-finished", onJobFinished);
  navigatorRt.off("model-changed", onRemoteModelChanging);
  navigatorRt.off("connect", onConnect);
  navigatorRt.off("disconnect", onDisconnect);
});
</script>

<template>
  <div>
    <div class="grid grid-cols-12 gap-4">

      <div class="prompt-container col-span-12 md:col-span-10">
        <label class="form-control border border-opacity-50 border-gray-500 cornered">
          <span class="label justify-normal ms-2 flex items-center">Prompting
            <oh-vue-icon @click="showTipsModal = true" name="hi-information-circle" class="ml-2"/>
          </span>

          <textarea v-model="imageParams.options.prompt" class="textarea h-24 textarea-bordered m-3" placeholder="Enter your prompt here! What do you want to see in the image?"></textarea>
          <textarea v-model="imageParams.options.negative_prompt" class="textarea h-24 textarea-bordered m-3" placeholder="Optionally, enter a negative prompt - which describes what you don't want to see in the image."></textarea>
        </label>
      </div>
      <div class="generate-button-container col-span-12 md:col-span-2 pt-0 m-3 md:pt-10">
        <div class="row mb-2">
          <button v-if="isImageParamsValid" @click="sendJobToNavigator" :disabled="isWorking" class="btn btn-success text-white text-opacity-100 w-full mb-5">Generate</button>
          <button v-else class="btn btn-disabled text-white text-opacity-100 w-full mb-5">Generate</button>
          <button class="btn btn-error btn-disabled text-white text-opacity-100 w-full">Interrupt / Cancel</button>
        </div>
        <div class="row">
          <h3 class="text-center text-lg font-bold">Status</h3>
          <span>{{progressText}}</span>
          <progress class="progress w-full" :class="progressClasses" :value="currentProgress" :max="maxProgress"></progress>
        </div>
      </div>
    </div>
    <div class="mt-5">
      <label class="form-control border border-opacity-50 border-gray-500 cornered">
        <span class="label ms-2">Generation Settings</span>
        <div class="m-3">
          <div class="form-control">
            <label class="label">Target Width</label>
            <div class="grid grid-cols-12 gap-4">
              <input v-model="imageParams.width" type="range" :class="rangeColorClasses" class="col-span-11 range" min="64" max="4096" />
              <input v-model="imageParams.width" type="text" class="col-span-11 md:col-span-1 w-1/4 md:w-1/2 input input-primary" @blur="validateImageSizeParams" />
            </div>
          </div>
          <div class="form-control pb-3">
            <label class="label">Target Height</label>
            <div class="grid grid-cols-12 gap-4">
              <input v-model="imageParams.height" type="range" :class="rangeColorClasses" class="col-span-11 range" min="64" max="4096" />
              <input v-model="imageParams.height" type="text" class="col-span-11 md:col-span-1 w-1/4 md:w-1/2 input input-primary" @blur="validateImageSizeParams" />
            </div>
            <span v-if="doesSizeRequireUpscale && !doesSizeExceedLimit"><em>Note: Due to the chosen size, your image will generate at half-resolution and will be upscaled to the full resolution.</em></span>
            <span class="text-error" v-if="doesSizeExceedLimit"><em>Error: The chosen size exceeds the maximum size, please choose a lower resolution.</em></span>
          </div>
          <div class="form-control">
            <label class="label">Aspect Ratio/Size Preview</label>
            <div class="preview-box-container mb-5">
              <SizePreviewBox :height="imageParams.height" :width="imageParams.width" />
            </div>
          </div>
          <div class="form-control">
            <label class="mb-2">
              <span class="ms-2">Image Model</span>
            </label>
            <select id="model-selector" v-model="imageParams.options.model" class="select neutral-border mb-2">
              <option v-for="model in availableModels" :value="model" :key="model.model_name">{{model.friendly_name ? model.friendly_name : model.model_name}}</option>
            </select>
          </div>
          <div class="form-control mt-2 mb-2">
            <label class="cursor-pointer">
              <input v-model="showAdvancedOptions" class="align-middle checkbox checkbox-secondary" type="checkbox" />
              <span class="ms-2 align-middle">Show Advanced Options?</span>
            </label>
          </div>
          <div v-if="showAdvancedOptions" class="form-control">
            <label class="mb-2">
              <span class="ms-2">Sampler</span>
            </label>
            <select class="select neutral-border mb-2">
              <option v-for="sampler in availableSamplers" :value="sampler" :key="sampler.name">{{sampler.name}}</option>
            </select>
          </div>
          <div v-if="showAdvancedOptions" class="form-control">
            <label class="cursor-pointer mb-2">
              <span class="ms-2">Steps</span>
            </label>
            <input v-model="imageParams.options.steps" class="input w-1/12 neutral-border" type="text" />
          </div>
          <div v-if="showAdvancedOptions" class="form-control mt-2">
            <label class="cursor-pointer">
              <span class="ms-2 align-middle">CFG Scale &nbsp;</span>
              <input v-model="imageParams.options.cfg_scale" class="align-middle neutral-border input" type="text" />
            </label>
          </div>
          <div v-if="showAdvancedOptions" class="form-control mt-2">
            <label class="cursor-pointer">
              <span class="ms-2 align-middle">Seed &nbsp;</span>
              <input v-model="imageParams.options.seed" class="align-middle neutral-border input" type="text" />
            </label>
          </div>
        </div>
      </label>
    </div>
    <div class="grid grid-cols-12 gap-4 mt-5">
      <div class="generated-image-container col-span-12 md:col-span-10">
        <label class="form-control border border-opacity-50 border-gray-500 cornered">
          <span class="label ms-2">Results</span>
          <img id="job-image" src="https://via.placeholder.com/800x600" alt="Generated Image" class="m-3 w-1/2" />
        </label>
      </div>
      <div class="generated-image-metadata-container col-span-12 md:col-span-2 pt-0 m-3 md:pt-10">
        <label class="form-control border border-opacity-50 border-gray-500 cornered">
          <span class="label ms-2">Metadata</span>
          <div class="m-3">
            <p>Image ID: 1234567890</p>
            <p>Generated on: 2021-10-01 12:34:56</p>
            <p>Generated by: User#1234</p>
          </div>
        </label>
      </div>
    </div>
    <div v-if="showTipsModal" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div class="modal-content bg-neutral-700 p-5 rounded-lg w-full md:w-1/2 mx-4">
        <h2 class="text-xl font-bold mb-4">How to Construct a Prompt</h2>
        <h3 class="text-lg font-bold mb-2">Be Specific</h3>
        <p>Provide a clear and concise description of what you want to see in the image. Use specific keywords and avoid ambiguous terms.</p>
        <p>For example, instead of saying "a beautiful scene", say "a sunset over the mountains with a clear sky".</p>
        <h3 class="text-lg font-bold mt-4 mb-2">Avoid Negations</h3>
        <p class="break-words">Avoid using negative terms like "no", "not", or "without" in your prompt. Negations can be difficult for the AI to interpret correctly, instead you should specify the things you do not want to see in the negative prompt area.</p>
        <h3 class="text-lg font-bold mt-4 mb-2">Use Negative Prompts</h3>
        <p>Use the negative prompt area to specify things you do not want to see in the image. This can help guide the AI to generate more accurate results.</p>
        <h3 class="text-lg font-bold mt-4 mb-2">Advanced Tips</h3>
        <span class="text-sm"><em>Note: Usage of advanced techniques can give you more control, but sometimes that control can cause images to generate incorrectly. If something doesn't look right, try shifting things around a bit!</em></span><br/>
        <ul>
          <li class="pt-2 pb-2">Prompt Weighting: You can wrap text in <code>()</code> in order to give it weight, and then optionally specify the weight with <code>:WEIGHT</code>. Example &mdash; <code>(flowers:1.2)</code></li>
          <li>BREAK: You can use <code>BREAK</code> to separate different parts of the prompt. Example &mdash; <code>Generate a landscape with a BREAK sunset over the mountains.</code></li>
        </ul>

        <button @click="showTipsModal = false" class="mt-4 btn btn-primary">Close</button>
      </div>
    </div>
  </div>
</template>

<style scoped>

.cornered {
  border-radius: 0.5rem;
}

.modal-content {
  max-height: 80vh;
  overflow-y: auto;
}

.neutral-border {
  border-color: #6e6d6d;
}

.preview-box-container {
  display: flex;
  justify-content: flex-start;
}

</style>