<script setup>
import {computed, inject, onMounted, onUnmounted, ref, watch} from "vue";
import { OhVueIcon } from "oh-vue-icons";
import {
  generateTxt2Img,
  getAvailableModels,
  getAvailableSamplers,
  getImageInfo,
  interruptJob
} from "@/services/NavigatorService";
import {useAlertStore} from "@/stores/alerts";
import SizePreviewBox from "@/components/SizePreviewBox.vue";
import {useRouter} from "vue-router";
import {saveAs} from "file-saver";
import {deleteImage} from "@/services/UserService";

const router = useRouter();

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

const isConnectedToRt = ref(false);

const recalledImageId = ref(null);

const isRecalledImageEligibleForUpscale = ref(false);

const currentProgress = ref(null);

const maxProgress = ref(100);

const isInitialConnection = ref(true);

const isDeletePending = ref(false);

const isModelChanging = ref(false);

const lastJob = ref(null);

const progressText = ref("Nothing to report yet...");

const currentJobId = ref(null);

const isGenSettingsExpanded = ref(true);

const progressClasses = computed(() => {
  if(isModelChanging.value) {
    return {
      "progress-warning": true,
    };
  }
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

const navigatorRt = inject("$navigator_rt");

const doesSizeRequireUpscale = computed(() => {
  return (imageParams.value.width * imageParams.value.height) > (1024 * 1024);
});

const doesSizeExceedLimit = computed(() => {
  return (imageParams.value.width * imageParams.value.height) > (2560 * 1440);
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

const isInterruptible = computed(() => {
  return (currentJobId.value && currentProgress.value);
});

const isEligibleForUpscale = computed(() => {
  if(!lastJob.value) return false;
  const upscaledWidth = lastJob.value.width * 2;
  const upscaledHeight = lastJob.value.height * 2;
  return (upscaledWidth * upscaledHeight) <= (2560 * 1440) && (upscaledWidth * upscaledHeight) > (1024 * 1024);
});

const getLinkForJobId = (jobId) => {
  return `${import.meta.env.VITE_API_BASE}/api/images/${jobId}`;
};

const toggleGenSettings = () => {
  isGenSettingsExpanded.value = !isGenSettingsExpanded.value;
}

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
      cfg_scale: imageParams.value.options.cfg_scale,
      seed: imageParams.value.options.seed,
    };
    generateTxt2Img(job).then((resp) => {
      console.log("Sent image request to Navigator", resp.data);
      currentJobId.value = resp.data.job_id;
      progressText.value = "Job queued, waiting for results...";
      lastJob.value = { ... job, status: 'queued', job_id: resp.data.job_id };
      // TODO: Handle queue status
    }).catch((error) => {
      console.error("from", error);
      useAlertStore().addAlert("Failed to send image generation request to Navigator, please try again later!", "error");
      isWorking.value = false;
    });
  } else {
    console.error("Invalid image parameters, cannot send job to Navigator");
  }
};

const saveLastJobImage = () => {
  if(lastJob.value && lastJob.value.img_path) {
    console.log("Downloading image", lastJob.value);
    saveAs(`${import.meta.env.VITE_API_BASE}${lastJob.value.img_path}`, `generated-image-${lastJob.value.job_id}.png`);
  } else {
    console.error("No image to download");
    useAlertStore().addAlert("No image to download, please generate an image first!", "error");
  }
};

const getImageForJob = computed(() => {
  if(!lastJob.value) return null;
  const job = lastJob.value;
  if(job.img_path) {
    return `${import.meta.env.VITE_API_BASE}${job.img_path}`;
  } else if(job.progress_path) {
    return `${import.meta.env.VITE_API_BASE}${job.progress_path}?step=${job.current_step}`;
  } else {
    return null;
  }
});

const onJobProgress = (data) => {
  console.log(data);
  if(data.job_id === currentJobId.value) {
    isModelChanging.value = false;
    currentProgress.value = data.current_step;
    maxProgress.value = data.total_steps;
    progressText.value = "Generating image... " + data.current_step + "/" + data.total_steps;
    lastJob.value = {
      ...lastJob.value,
      job_id: data.job_id,
      progress_path: data.progress_path,
      current_step: data.current_step,
      total_steps: data.total_steps,
      status: 'in_progress',
    };
    // document.getElementById("job-image").src = `${import.meta.env.VITE_API_BASE}${data.progress_path}?step=${data.current_step}`;
  }
};

const onJobFinished = (data) => {
  console.log(data);
  if(data.job_id === currentJobId.value) {
    currentProgress.value = null;
    progressText.value = "Job completed!";
    currentJobId.value = null;
    // document.getElementById("job-image").src = `${import.meta.env.VITE_API_BASE}${data.img_path}`;
    isWorking.value = false;
    lastJob.value = {
      ...lastJob.value,
      img_path: data.img_path,
      status: 'completed',
    }
    setTimeout(() => {
      progressText.value = "Nothing to report yet...";
    }, 3000);
  }
};

const onInterruptClicked = () => {
  if(currentJobId.value) {
    console.log("Interrupting job", currentJobId.value);
    interruptJob(currentJobId.value).then((_) => {
      console.log(`Interrupted job ${currentJobId.value}`);
      useAlertStore().addAlert(`Job interrupted successfully`, "success");
      progressText.value = "Job interrupted!";
    }).catch((error) => {
      console.error(`Failed to interrupt job ${currentJobId.value}`, error);
      useAlertStore().addAlert(`Failed to interrupt job with ID: ${currentJobId.value}`, "error");
    });
  } else {
    console.error("No job to interrupt");
  }
}

const onRemoteModelChanging = (data) => {
  console.log("Remote model changed", data);
  if(data.job_id === currentJobId.value) {
    progressText.value = "Model change in progress...";
    currentProgress.value = null;
    isModelChanging.value = true;
  }
}

const onDisconnect = () => {
  isConnectedToRt.value = false;
  console.error("Navigator RT disconnected, attempting to reconnect...");
  useAlertStore().addAlert("Navigator RT disconnected, attempting to reconnect...", "error");
};

const onConnect = () => {
  isConnectedToRt.value = true;
  if(isInitialConnection.value) {
    console.log("Navigator RT connected (first connect, notification disabled)!");
    isInitialConnection.value = false;
    return;
  }
  console.log("Navigator RT reconnected!");
  useAlertStore().addAlert("Navigator RT reconnected!", "success");
};

const onDeleteClick = () => {
  console.log("Clicked on delete for job", lastJob.value.job_id);
  if(isDeletePending.value) {
    deleteImage(lastJob.value.job_id).then((res) => {
      if(res.status !== 204) {
        console.error(`Failed to delete image for job ${lastJob.value.job_id}`, res);
        useAlertStore().addAlert(`Failed to delete image with ID: ${lastJob.value.job_id}`, "error");
        return;
      }
      console.log(`Deleted image for job ${lastJob.value.job_id}`);
      lastJob.value = null;
      useAlertStore().addAlert(`Image deleted successfully`, "success");
      isDeletePending.value = false;
    }).catch((error) => {
      console.error(`Failed to delete image for job ${lastJob.value.job_id}`, error);
      useAlertStore().addAlert(`Failed to delete image with ID: ${lastJob.value.job_id}`, "error");
    });
  } else {
    isDeletePending.value = true;
    setTimeout(() => {
      isDeletePending.value = false;
    }, 2500);
  }
}

const extractModelNameFromInfo = (infoText) => {
  // Regular expression to match the "Model: " pattern followed by the model name
  const modelRegex = /Model: ([^,\n]+)/;
  const match = infoText.match(modelRegex);

  if (match) {
    return match[1].trim(); // Extract the captured group and trim whitespace
  } else {
    return null; // Model not found
  }
}

const extractSizeFromInfo = (infoText) => {
  // Regular expression to match the "Size: " pattern followed by the size
  const sizeRegex = /Size: (\d+)x(\d+)/;
  const match = infoText.match(sizeRegex);

  if (match) {
    return {
      width: parseInt(match[1], 10),
      height: parseInt(match[2], 10),
    };
  } else {
    return null; // Size not found
  }
}

const recallLastJob = (cb) => {
  if(!lastJob.value) {
    console.error("No last job to recall");
    useAlertStore().addAlert("No last job to recall, please generate an image first!", "error");
    return;
  }
  if(cb) {
    recallJobParameters(lastJob.value.job_id, cb);
  } else {
    recallJobParameters(lastJob.value.job_id);
  }
}

const copyImageLink = () => {
  if(lastJob.value && lastJob.value.img_path) {
    navigator.clipboard.writeText(`${import.meta.env.VITE_API_BASE}${lastJob.value.img_path}`);
    useAlertStore().addAlert("Image link copied to clipboard!", "success");
  } else {
    console.error("No image link to copy");
    useAlertStore().addAlert("No image link to copy, please generate an image first!", "error");
  }
}

const onUpscaleClick = () => {
  console.log("Upscaling image");
  recallLastJob(() => {
    const originalWidth = lastJob.value.width;
    const originalHeight = lastJob.value.height;
    imageParams.value.width = originalWidth * 2;
    imageParams.value.height = originalHeight * 2;
    setTimeout(() => {
      sendJobToNavigator();
      setTimeout(() => {
        imageParams.value.width = originalWidth;
        imageParams.value.height = originalHeight;
        // After the user has upscaled the image, they probably don't want to re-generate the base image
        // on the next run, so reset the seed to -1
        imageParams.value.options.seed = -1;
      }, 1000);
    }, 1500);
  });
}

const onRecallUpscaleClick = () => {
  console.log("Recalling and upscaling image");
  recallJobParameters(recalledImageId.value, () => {
    const originalWidth = imageParams.value.width;
    const originalHeight = imageParams.value.height;
    const upscaledWidth = originalWidth * 2;
    const upscaledHeight = originalHeight * 2;
    if((upscaledWidth * upscaledHeight) > (2560 * 1440)) {
      useAlertStore().addAlert("Upscaled image exceeds maximum resolution, so this image is unfortunately not eligible for upscaling.", "error");
      return;
    }
    imageParams.value.width = upscaledWidth;
    imageParams.value.height = upscaledHeight;
    setTimeout(() => {
      sendJobToNavigator();
      setTimeout(() => {
        imageParams.value.width = originalWidth;
        imageParams.value.height = originalHeight;
        // After the user has upscaled the image, they probably don't want to re-generate the base image
        // on the next run, so reset the seed to -1
        imageParams.value.options.seed = -1;
      }, 1000);
    }, 1500);
  });
}

const recallJobParameters = (imageId, cb) => {
  console.log("Recalling job parameters for image ID", imageId);
  getImageInfo(imageId).then((resp) => {
    recalledImageId.value = imageId;
    console.log("Received Image Info:", resp.data);
    let params = resp.data.parameters;
    imageParams.value.options.prompt = params["Prompt"];
    imageParams.value.options.negative_prompt = params["Negative prompt"];
    let extractedModelName = extractModelNameFromInfo(resp.data.info);
    let locatedModel = availableModels.value.find((model) => model.model_name === extractedModelName);
    if(locatedModel) {
      imageParams.value.options.model = locatedModel;
    } else {
      console.error(`Failed to locate model (${extractedModelName}) from image info, using default model`);
    }
    imageParams.value.options.sampler = availableSamplers.value.find((sampler) => sampler.name === params.Sampler);
    imageParams.value.options.steps = params["Steps"];
    if(params["Hires resize-1"] !== 0 || params["Hires resize-2"] !== 0) {
      imageParams.value.width = params["Hires resize-1"];
      imageParams.value.height = params["Hires resize-2"];
    } else {
      let extractedSize = extractSizeFromInfo(resp.data.info);
      imageParams.value.width = extractedSize.width;
      imageParams.value.height = extractedSize.height;
    }

    // Check if the image is eligible for upscaling, so that the user can choose to upscale it if desired
    // To be eligible,
    // the targeted upscaled image must be less than or equal to 2560x1440 and greater than 1024x1024
    // (if it's less than 1024x1024, then it won't trigger the upscale process on Navigator)
    const upscaledWidth = imageParams.value.width * 2;
    const upscaledHeight = imageParams.value.height * 2;
    isRecalledImageEligibleForUpscale.value = upscaledWidth * upscaledHeight <= (2560 * 1440) && (upscaledWidth * upscaledHeight) > (1024 * 1024);

    imageParams.value.options.cfg_scale = params["CFG scale"];
    imageParams.value.options.seed = params.Seed;
    useAlertStore().addAlert("Recalled job parameters successfully!", "success");
    if(cb) {
      cb();
    }
  }).catch((error) => {
    console.error("Failed to recall job parameters", error);
    useAlertStore().addAlert("Failed to recall job parameters, please try again later!", "error");
  });
}


watch(showTipsModal, (newValue) => {
  toggleBodyScroll(newValue);
});

watch(imageParams, (newValue) => {
  if(!isNaN(newValue.options.seed)) {
    imageParams.value.options.seed = Number(newValue.options.seed);
  } else {
    imageParams.value.options.seed = -1;
  }

  if(!isNaN(newValue.options.cfg_scale)) {
    imageParams.value.options.cfg_scale = Number(newValue.options.cfg_scale);
  } else {
    imageParams.value.options.cfg_scale = 7.0;
  }

  if(!isNaN(newValue.options.steps)) {
    imageParams.value.options.steps = Number(newValue.options.steps);
  } else {
    imageParams.value.options.steps = 50;
  }

  if(!isNaN(newValue.width)) {
    imageParams.value.width = Number(newValue.width);
  } else {
    imageParams.value.width = 800;
  }

  if(!isNaN(newValue.height)) {
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
  isConnectedToRt.value = navigatorRt.isSocketConnected;
  // Detect "recall" query parameter and attempt to recall job parameters
  if (router.currentRoute.value.query.recall) {
    console.log("Recalling job parameters from query", router.currentRoute.value.query.recall);
    recallJobParameters(router.currentRoute.value.query.recall);
  }
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
          <button v-if="isImageParamsValid" @click="sendJobToNavigator" :disabled="isWorking || !isConnectedToRt" class="btn btn-success w-full mb-5">Generate</button>
          <button v-else class="btn btn-disabled text-opacity-100 w-full mb-5">Generate</button>
          <button :disabled="!isInterruptible" @click="onInterruptClicked" class="btn btn-error text-white text-opacity-100 w-full">Interrupt / Cancel</button>
        </div>
        <div class="row">
          <h3 class="text-center text-lg font-bold">Status</h3>
          <span>{{progressText}}</span>
          <progress class="progress w-full" :class="progressClasses" :value="currentProgress" :max="maxProgress"></progress>
        </div>
      </div>
    </div>
    <div class="mt-5">
      <div class="form-control border border-opacity-50 border-gray-500 cornered">
        <span v-show="isGenSettingsExpanded" @click="toggleGenSettings" class="label ms-2">Generation Settings</span>
        <span v-show="!isGenSettingsExpanded" @click="toggleGenSettings" class="label ms-2">Generation Settings (Hidden; Click to expand)</span>
        <div v-show="recalledImageId !== null && isGenSettingsExpanded" class="m-3">
          <span>Recalled image ID: {{recalledImageId}}</span>
          <img class="m-3 w-3/4 md:w-1/2 lg:w-1/6" :src="getLinkForJobId(recalledImageId)" alt="Recalled Image" />
          <button @click="recalledImageId = null" class="m-3 btn btn-info">Clear Recall</button>
          <button @click="onRecallUpscaleClick" :disabled="!isRecalledImageEligibleForUpscale" class="m-3 btn btn-secondary">Upscale 2x</button>
        </div>
        <div v-show="isGenSettingsExpanded" class="m-3">
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
            <select v-model="imageParams.options.sampler" class="select neutral-border mb-2">
              <option v-for="sampler in availableSamplers" :value="sampler" :key="sampler.name">{{sampler.name}}</option>
            </select>
          </div>
          <div v-if="showAdvancedOptions" class="form-control">
            <label class="cursor-pointer mb-2">
              <span class="ms-2">Steps</span>
            </label>
            <input v-model="imageParams.options.steps" class="input w-1/2 md:w-1/4 lg:w-1/12 neutral-border" type="text" />
          </div>
          <div v-if="showAdvancedOptions" class="form-control mt-2">
            <label class="cursor-pointer mb-2">
              <span class="ms-2 align-middle">CFG Scale &nbsp;</span>
              <input v-model="imageParams.options.cfg_scale" class="align-middle w-1/2 md:w-1/4 lg:w-1/12 neutral-border input" type="text" />
            </label>
          </div>
          <div v-if="showAdvancedOptions" class="form-control mt-2">
            <label class="cursor-pointer">
              <span class="ms-2 align-middle">Seed &nbsp;</span>
              <input v-model="imageParams.options.seed" class="align-middle neutral-border input" type="text" />
              <button @click="imageParams.options.seed = -1" class="btn btn-secondary mt-2 lg:mt-0 lg:ml-3">Randomize Seed</button>
            </label>
          </div>
        </div>
      </div>
    </div>
    <div class="grid grid-cols-12 gap-4 mt-5">
      <div class="generated-image-container col-span-12 md:col-span-10">
        <label class="form-control border border-opacity-50 border-gray-500 cornered">
          <span class="label ms-2">Results</span>
          <img id="job-image" :src="getImageForJob" alt="Generated Image" class="m-3 pl-2 pr-8 w-full" />
        </label>
      </div>
      <div class="generated-image-metadata-container col-span-12 md:col-span-2 pt-0 m-3 md:pt-10">
        <div class="form-control border border-opacity-50 border-gray-500 cornered">
          <p class="label ms-2 ml-auto mr-auto">Post-processing</p>
          <div class="m-3">
            <button :disabled="!lastJob || lastJob.status !== 'completed'" @click="saveLastJobImage" class="btn btn-success w-full relative"><oh-vue-icon animation="float" class="absolute w-24 size-6 -translate-y-1/2 left-4" name="fa-download"/>Download Image</button>
            <button :disabled="!lastJob || lastJob.status !== 'completed'" @click="copyImageLink" class="btn btn-info w-full mt-2 relative"><oh-vue-icon class="absolute size-7 w-24 -translate-y-1/2 left-4" animation="wrench" name="hi-clipboard-copy"/>Copy Image Link</button>
            <button v-if="!isDeletePending" :disabled="!lastJob || lastJob.status !== 'completed'" @click="onDeleteClick" class="btn btn-error w-full mt-2 relative"><oh-vue-icon class="absolute top-1/2 size-7 w-24 -translate-y-1/2 left-4" name="md-deleteforever"/>Delete Image</button>
            <button v-else :disabled="!lastJob || lastJob.status !== 'completed'" @click="onDeleteClick" class="btn btn-error w-full mt-2 relative"><oh-vue-icon class="absolute size-7 top-1/2 w-24 -translate-y-1/2 left-4" name="md-deleteforever"/><strong>Click To Confirm</strong></button>
            <button :disabled="!lastJob || lastJob.status !== 'completed'" @click="recallLastJob" class="btn btn-primary w-full mt-2 relative"><oh-vue-icon class="absolute size-6 w-24 -translate-y-1/2 left-4" animation="spin" name="md-replaycirclefilled"/> Recall Parameters</button>
            <button :disabled="!lastJob || lastJob.status !== 'completed' || !isEligibleForUpscale" @click="onUpscaleClick" class="btn btn-secondary w-full mt-2 relative"><oh-vue-icon class="absolute size-6 w-24 -translate-y-1/2 left-4" animation="pulse" name="fa-angle-double-up"/>Recall & Upscale 2x</button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="showTipsModal" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div class="modal-content bg-neutral-700 p-5 rounded-lg w-5/6 md:w-3/4 mx-4">
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
          <li class="pt-2 pb-2">
            Prompt Weighting: You can wrap text in <code>()</code> in order to give it weight, and then optionally specify the weight with <code>:WEIGHT</code>. Example &mdash; <code>(flowers:1.2)</code>
            <ul>
              <li>You can also use <code>[]</code>'s to do the reverse! Surrounding parts of your prompt with square-brackets in order to give it <em>less</em> weight/attention. Example &mdash; <code>[flowers]</code>'s</li>
            </ul>
          </li>
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

.generated-image-container {
  /*display: flex;
  justify-content: center;*/
  /*width: fit-content;*/
  min-width: 75%;
}
</style>