<script setup>
import {computed, inject, nextTick, onMounted, onUnmounted, ref, toRaw, watch} from "vue";
import { OhVueIcon } from "oh-vue-icons";
import {
  generateImg2Img,
  generateTxt2Img,
  getAvailableModels,
  getAvailableSamplers,
  getAvailableSchedulers,
  getAvailableModules,
  getImageInfo, getLimits, getMetadataForImage, getMyCategories,
  interruptJob, upscaleImageWithHR
} from "@/services/NavigatorService";
import {useAlertStore} from "@/stores/alerts";
import SizePreviewBox from "@/components/generate/SizePreviewBox.vue";
import {useRouter} from "vue-router";
import {saveAs} from "file-saver";
import {deleteImage} from "@/services/UserService";
import CategorySelect from "@/components/CategorySelect.vue";
import {useSettingsStore} from "@/stores/settings";
import LoraSelector from "@/components/generate/LoraSelector.vue";
import SettingsView from "./SettingsView.vue";

const router = useRouter();

const imageParams = ref({
  width: 1024,
  height: 1024,
  categoryId: null,
  options: {
    prompt: "",
    negative_prompt: "",
    model: {},
    sampler: {},
    scheduler: {},
    steps: 35,
    cfg_scale: 5.0,
    distilled_cfg: 3.5,
    seed: -1,
    subseed: -1,
    subseed_strength: null,
    image_enhancements: false
  },
});

const img2imgParams = ref({
  startingInput: null,
  startingInputJobId: null,
  inpainting: false
});

const settings = useSettingsStore()

const isWorking = ref(false);

const isConnectedToRt = ref(false);

const recalledImageId = ref(null);

const recallTextEntry = ref("");

const recallEntryFailed = ref(false);

const isRecalledImageEligibleForUpscale = ref(false);

const currentProgress = ref(null);

const maxProgress = ref(100);

const isInitialConnection = ref(true);

const isDeletePending = ref(false);

const isModelChanging = ref(false);

const lastJob = ref(null);

const progressText = ref("Nothing to report yet...");

const currentJobId = ref(null);

const isGenSettingsExpanded = ref(false);

const categories = ref([]);

const allAdditionalModules = ref([]);
const enabledAdditionalModules = ref([]);
const selectedAdditionalModule = ref('');

const isImg2Img = computed(() => {
  return router.currentRoute.value.name === "img2img";
});

const inpaintingCanvas = ref(null);

const loraPromptAddition = ref("")
const isShowingLoraAdditions = ref(false)
const loraSelector = ref(null)
const lorasResolved = ref(false)

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

const isRandomized = computed(() => {
  return imageParams.value.options.seed === -1 && (imageParams.value.options.subseed === -1 || imageParams.value.options.subseed === null);
})

const showTipsModal = ref(false);
const showAdvancedOptions = ref(false);
const availableModels = ref([]);
const availableSamplers = ref([]);
const availableSchedulers = ref([]);

const navigatorLimits = ref({})

const selectedPredefinedPrompt = ref({});

const navigatorRt = inject("$navigator_rt");

const doesSizeRequireUpscale = computed(() => {
  return (imageParams.value.width * imageParams.value.height) > (1024 * 1024);
});

const doesSizeExceedLimit = computed(() => {
  return (imageParams.value.width * imageParams.value.height) > navigatorLimits.value.max_pixels;
});

const availableAdditionalModules = computed(() => {
  return allAdditionalModules.value.filter(module => {
    return !enabledAdditionalModules.value.some(selected => selected.model_name === module.model_name)
  });
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

const onCategorySelected = (categoryId) => {
  console.log("Selected category", getCategoryName(categoryId), categoryId);
  imageParams.value.categoryId = categoryId;
};

const onAddModule = async () => {
  console.debug("Adding module!");
  if (!selectedAdditionalModule.value) return;

  const moduleToAdd = allAdditionalModules.value.find(m => m.model_name === selectedAdditionalModule.value);
  if (moduleToAdd) {
    console.log("Found module: ", toRaw(moduleToAdd));
    enabledAdditionalModules.value = [...enabledAdditionalModules.value, moduleToAdd];
  }
  await nextTick(); // Needed as otherwise we update the available options too quickly, and the browser DOM vs Vue gets a bit confused (Race condition)
  selectedAdditionalModule.value = '';
}

const onRemoveModule = (name) => {
  enabledAdditionalModules.value = enabledAdditionalModules.value.filter(module => module.model_name !== name);
}

const isInterruptible = computed(() => {
  return (currentJobId.value !== null);
});

const isEligibleForUpscale = computed(() => {
  if(!lastJob.value) return false;
  const upscaledWidth = lastJob.value.width * 2;
  const upscaledHeight = lastJob.value.height * 2;
  return (upscaledWidth * upscaledHeight) <= navigatorLimits.value.max_pixels;
});

const getLinkForJobId = (jobId) => {
  return `${import.meta.env.VITE_API_BASE}/api/images/${jobId}`;
};

const getPreviewOfFile = computed(() => {
  if(img2imgParams.value.startingInput) {
    return img2imgParams.value.startingInput;
  }
  return null;
});

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

const getPredefinedPrompts = computed(() => {
  return settings.getSetting("predefinedPrompts") !== null ? settings.getSetting("predefinedPrompts") : [];
})

const applyPredefinedPrompt = () => {
  const prompt = toRaw(selectedPredefinedPrompt.value);
  console.debug("Applying predefined prompt:", prompt);
  if(prompt.prompt.length > 0) {
    imageParams.value.options.prompt = prompt.prompt;
    console.debug("Applied positive prompt");
  }
  if(prompt.negativePrompt.length > 0) {
    imageParams.value.options.negative_prompt = prompt.negativePrompt;
    console.debug("Applied negative prompt");
  }
}

const initializeData = async () => {
  let errored = false;
  await getAvailableModels().then(async (resp) => {
    availableModels.value = resp.data.models;
    console.log("Fetched models from Navigator", resp.data.models);
    if(resp.data.models.length > 0){
      imageParams.value.options.model = resp.data.models[0];
    }
  }).catch((error) => {
    console.error("Failed to fetch models from Navigator", error);
    errored = true;
  });
  await getAvailableSamplers().then(async (resp) => {
    availableSamplers.value = resp.data;
    console.log("Fetched samplers from Navigator", resp.data);
    if(resp.data.length > 0){
      imageParams.value.options.sampler = resp.data[0];
    }
  }).catch((error) => {
    console.error("Failed to fetch samplers from Navigator", error);
    errored = true;
  });

  await getAvailableSchedulers().then(async (resp) => {
    availableSchedulers.value = resp.data;
    console.log("Fetched schedulers from Navigator", resp.data);
    if(resp.data.length > 0){
      imageParams.value.options.scheduler = resp.data[0];
    }
  })

  await getAvailableModules().then(async (resp) => {
    allAdditionalModules.value = resp.data;
  });

  try {
    let limitsResp = await getLimits()
    navigatorLimits.value = limitsResp.data;
    console.log("Fetched limits from Navigator", limitsResp.data);
  } catch (e) {
      console.error("Failed to fetch limits from Navigator", e);
      // Fall back to default values
      navigatorLimits.value = {
        max_pixels: 3686400
      }
  }

  await retrieveCategories();
  console.log("Done loading initial data");

  if(errored) {
    useAlertStore().addAlert("Failed to fetch data from Navigator, some functionality may work unexpectedly!", "error");
  }
}

const sendJobToNavigator = () => {
  if(isImageParamsValid.value) {
    console.log("Sending job to Navigator", imageParams.value);
    progressText.value = "Firing off request..."
    isWorking.value = true;
    let job = {
      prompt: `${imageParams.value.options.prompt} ${loraPromptAddition.value}`,
      negative_prompt: imageParams.value.options.negative_prompt,
      model_name: imageParams.value.options.model.model_name,
      sampler_name: imageParams.value.options.sampler.name,
      scheduler_name: imageParams.value.options.scheduler.name,
      steps: imageParams.value.options.steps,
      width: imageParams.value.width,
      height: imageParams.value.height,
      cfg_scale: imageParams.value.options.cfg_scale,
      distilled_cfg: imageParams.value.options.distilled_cfg,
      modules: enabledAdditionalModules.value.map((m) => m.model_name),
      seed: imageParams.value.options.seed,
      categoryId: imageParams.value.categoryId
    };

    // Check to see if we have custom HRF steps defined, if so, attach it to the Navigator request
    const upscaleSteps = settings.getSetting("upscaleSteps")
    if(upscaleSteps !== undefined && upscaleSteps !== null && upscaleSteps !== -1) {
      job.hrf_steps = upscaleSteps;
    }

    const upscaleDenoisingStrength = settings.getSetting("upscaleDenoisingStrength")
    if(upscaleDenoisingStrength !== undefined && upscaleDenoisingStrength !== null && upscaleDenoisingStrength !== -1) {
      job.denoising_strength = upscaleDenoisingStrength;
    }

    const upscaler = settings.getSetting("upscaler")
    if(upscaler !== undefined && upscaler !== null && upscaler !== "DEFAULT") {
      job.upscaler_name = upscaler;
    }

    if(imageParams.value.options.subseed_strength) {
      console.log(`Subseed strength (variation: ${imageParams.value.options.subseed_strength})`);
      job.subseed_strength = imageParams.value.options.subseed_strength;
      if(imageParams.value.options.subseed) {
        console.log(`Subseed (variation seed: ${imageParams.value.options.subseed})`);
        job.subseed = imageParams.value.options.subseed;
      } else {
        job.subseed = -1;
      }
      // Reset the subseed strength after 1 second
      setTimeout(() => {
        imageParams.value.options.subseed_strength = null;
      }, 1000);
    }

    if(imageParams.value.options.image_enhancements) {
      job.image_enhancements = true;
    }

    if(!isImg2Img.value) {
      generateTxt2Img(job).then((resp) => {
        console.log("Sent image request to Navigator", resp.data);
        currentJobId.value = resp.data.job_id;
        progressText.value = "Job queued, waiting to be picked up by Navigator...";
        lastJob.value = { ... job, status: 'queued', job_id: resp.data.job_id };
        isGenSettingsExpanded.value = false;
        loraSelector.value.forceCollapse();
      }).catch((error) => {
        console.error("from", error);
        useAlertStore().addAlert("Failed to send image generation request to Navigator, please try again later!", "error");
        isWorking.value = false;
      });
    } else {
      if(img2imgParams.value.inpainting) {
        job.mask = getMaskFromCanvas();
        if(job.mask === null) {
          console.error("Failed to get mask from canvas, cannot send job to Navigator");
          useAlertStore().addAlert("Failed to get mask from canvas, please try again!", "error");
          isWorking.value = false;
          return;
        }
      }
      if(img2imgParams.value.startingInputJobId) {
        job.init_image = `NAVIGATOR_${img2imgParams.value.startingInputJobId}`;
      } else {
        job.init_image = stripBase64Prefix(img2imgParams.value.startingInput);
      }
      generateImg2Img(job).then((resp) => {
        console.log("Sent image request to Navigator", resp.data);
        currentJobId.value = resp.data.job_id;
        progressText.value = "Job queued, waiting to be picked up by Navigator...";
        lastJob.value = { ... job, status: 'queued', job_id: resp.data.job_id };
        isGenSettingsExpanded.value = false;
        loraSelector.value.forceCollapse();
      }).catch((error) => {
        console.error("from", error);
        useAlertStore().addAlert("Failed to send image generation request to Navigator, please try again later!", "error");
        isWorking.value = false;
      });
    }
  } else {
    console.error("Invalid image parameters, cannot send job to Navigator");
  }
};

const sendUpscaleJobToNavigator = (jobId) => {
  console.log("Sending upscale job to Navigator", jobId);
  isWorking.value = true;
  progressText.value = "Firing off request..."
  let job = {}
  // Check to see if we have custom HRF steps defined, if so, attach it to the Navigator request
  const upscaleSteps = settings.getSetting("upscaleSteps")
  if(upscaleSteps !== undefined && upscaleSteps !== null && upscaleSteps !== -1) {
    job.hrf_steps = upscaleSteps;
  }

  const upscaleDenoisingStrength = settings.getSetting("upscaleDenoisingStrength")
  if(upscaleDenoisingStrength !== undefined && upscaleDenoisingStrength !== null && upscaleDenoisingStrength !== -1) {
    job.denoising_strength = upscaleDenoisingStrength;
  }

  const upscaler = settings.getSetting("upscaler")
  if(upscaler !== undefined && upscaler !== null && upscaler !== "DEFAULT") {
    job.upscaler_name = upscaler;
  }
  upscaleImageWithHR(jobId, job).then((resp) => {
    console.log("Sent upscale request to Navigator", resp.data);
    currentJobId.value = resp.data.job_id;
    progressText.value = "Job queued, waiting to be picked up by Navigator...";
    lastJob.value = { status: 'queued', job_id: resp.data.job_id};
    isGenSettingsExpanded.value = false;
    loraSelector.value.forceCollapse();
  }).catch((error) => {
    console.error("Failed to send upscale request to Navigator", error);
    useAlertStore().addAlert("Failed to send upscale request to Navigator, please try again later!", "error");
    isWorking.value = false;
  });
}

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
    interruptJob(currentJobId.value).then((res) => {
      console.log(`Interrupted job ${currentJobId.value}`);
      useAlertStore().addAlert(`Job interrupted successfully`, "success");
      if(res.data.status !== undefined && res.data.status === "removed") {
        // The job was removed from the queue, reset the UI back to the expected state
        currentJobId.value = null;
        lastJob.value = null;
        isWorking.value = false;
        progressText.value = "Job cancelled!";
        setTimeout(() => {
          progressText.value = "Nothing to report yet...";
        }, 2000)
      } else {
        // The job was interrupted, since this will still fire off the job-finished event, we don't need to do much.
        progressText.value = "Job interrupted, waiting for final results!";
      }
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

const onRecallClick = () => {
  recallJobParameters(recallTextEntry.value, null, true, () => {
    recallTextEntry.value = "";
    recallEntryFailed.value = true;
    setTimeout(() => {
      recallEntryFailed.value = false;
    }, 3500);
  })
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

/**
 * Returns a list of Forge modules given a speciefied info text string
 * @param {string} info - Represents the "info" text string from Forge
 * @returns {string[]} Any found modules, concatenated into an array with `.safetensors` appended to the end of each element.
 */
const parseModulesFromInfo = (infoText) => {
  // Example: "... Model hash: e6da438d1a, Model: my-fancy-model, Version: f2.0.1v1.10.1-previous-669-gdfdcbab6, Module 1: ae, Module 2: t5xxl_fp8_e4m3fn_scaled"
  // This regex finds all keys starting with "Module", and captures the value after the colon.
  const moduleRegex = /Module \d+:\s*([^,]+)/g;
  // For each match, we take the first captured group (the value).
  return Array.from(infoText.matchAll(moduleRegex), match => `${match[1]}.safetensors`);
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

const recallLastJob = (cb, shouldSetRecalled = true) => {
  if(!lastJob.value) {
    console.error("No last job to recall");
    useAlertStore().addAlert("No last job to recall, please generate an image first!", "error");
    return;
  }
  if(cb) {
    recallJobParameters(lastJob.value.job_id, cb, shouldSetRecalled);
  } else {
    recallJobParameters(lastJob.value.job_id, undefined, shouldSetRecalled);
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

const onRandomizationClick = () => {
  imageParams.value.options.seed = -1;
  imageParams.value.options.subseed = null;
  imageParams.value.options.subseed_strength = null;
}

const onNewVariationClick = (variation) => {
  console.log("Clicked on variation: ", variation);
  isWorking.value = true;
  imageParams.value.options.subseed = -1;
  imageParams.value.options.subseed_strength = variation;
  sendJobToNavigator(() => {});
}

// Variation is a number between 0 and 1
// 0 is the weakest variation (barely any change), 1 is the strongest (most change)
const onVariationClick = (variation) => {
  console.log("Clicked on variation", variation);
  isWorking.value = true;
  recallLastJob(() => {
    imageParams.value.options.subseed = -1;
    imageParams.value.options.subseed_strength = variation;
    setTimeout(() => {
      sendJobToNavigator(); // If this fails, it will reset the `isWorking` state
    }, 500);
  }, false)
}

const onUpscaleClick = () => {
  console.log("Upscaling image");
  isWorking.value = true;
  sendUpscaleJobToNavigator(lastJob.value.job_id); // If this fails, it will reset the `isWorking` state
  // After the user has upscaled the image, they probably don't want to re-generate the base image
  // on the next run, so reset the seed to -1
  imageParams.value.options.seed = -1;
  imageParams.value.options.subseed = null;
  imageParams.value.options.subseed_strength = null;
}

const onRecallUpscaleClick = () => {
  console.log("Recalling and upscaling image");
  isWorking.value = true;
  sendUpscaleJobToNavigator(recalledImageId.value); // If this fails, it will reset the `isWorking` state
  imageParams.value.options.seed = -1;
  imageParams.value.options.subseed = null;
  imageParams.value.options.subseed_strength = null;
}

const onRecallVariationClick = (variation) => {
  console.log("Recalling and varying image", variation);
  isWorking.value = true;
  recallJobParameters(recalledImageId.value, () => {
    imageParams.value.options.subseed_strength = variation;
    imageParams.value.options.subseed = -1;
    setTimeout(() => {
      sendJobToNavigator();
    }, 500);
  }, false);
}

const recallJobParameters = (imageId, cb, shouldSetRecall = true, onRecallFail) => {
  console.log("Recalling job parameters for image ID", imageId);
  getImageInfo(imageId).then((resp) => {
    if(shouldSetRecall) {
      recalledImageId.value = imageId;
    }
    console.log("Received Image Info:", resp.data);
    let params = resp.data.parameters;
    imageParams.value.options.prompt = params["Prompt"];
    imageParams.value.options.negative_prompt = params["Negative prompt"];
    adjustHeight(positivePromptArea.value)
    adjustHeight(negativePromptArea.value)
    let extractedModelName = extractModelNameFromInfo(resp.data.info);
    let locatedModel = availableModels.value.find((model) => model.model_name === extractedModelName);
    if(locatedModel) {
      imageParams.value.options.model = locatedModel;
    } else {
      console.error(`Failed to locate model (${extractedModelName}) from image info, using default model`);
    }
    let infoModules = parseModulesFromInfo(resp.data.info);
    infoModules.forEach(m => {
      let foundModule = availableAdditionalModules.value.find((module) => module.model_name === m)
      if (foundModule) {
        enabledAdditionalModules.value.push(foundModule);
      }
    })
    imageParams.value.options.sampler = availableSamplers.value.find((sampler) => sampler.name === params.Sampler);
    imageParams.value.options.scheduler = availableSchedulers.value.find((scheduler) => scheduler.label === params["Schedule type"])
    imageParams.value.options.steps = params["Steps"];

    let extractedSize = extractSizeFromInfo(resp.data.info);
    imageParams.value.width = extractedSize.width;
    imageParams.value.height = extractedSize.height;

    const subseed = params["Variation seed"];
    const subseedStrength = params["Variation seed strength"];

    if(subseed !== undefined && subseed !== "") {
      imageParams.value.options.subseed = subseed;
      console.log("Subseed found", subseed);
      if(subseedStrength) {
        imageParams.value.options.subseed_strength = subseedStrength;
        console.log("Subseed strength found", subseedStrength);
      } else {
        imageParams.value.options.subseed_strength = 0.3;
        console.log("Subseed strength not found, defaulting to 0.3");
      }
    }

    // Check if the image is eligible for upscaling, so that the user can choose to upscale it if desired
    // To be eligible,
    // the targeted upscaled image must be less than or equal to `navigatorLimits.max_pixels`
    const upscaledWidth = imageParams.value.width * 2;
    const upscaledHeight = imageParams.value.height * 2;
    isRecalledImageEligibleForUpscale.value = upscaledWidth * upscaledHeight <= navigatorLimits.value.max_pixels;

    imageParams.value.options.cfg_scale = params["CFG scale"];
    imageParams.value.options.distilled_cfg = params.distilled_cfg || params["Distilled CFG Scale"] || 3.5;
    imageParams.value.options.seed = params.Seed;

    // Check to see if image enhancements ("FreeU" or "SAG - SelfAttentionGuidance") was applied to the recalled image
    if(params["freeu_enabled"] === "True" || params["sag_enabled"] === "True") {
      imageParams.value.options.image_enhancements = true;
    }

    getMetadataForImage(imageId).then((metadata) => {
      console.log("Received Image Metadata:", metadata.data);
      if(metadata.data.category_id !== null) {
        imageParams.value.categoryId = metadata.data.category_id;
        console.log(`Image is categorized under ${categories.value.find((c) => c.id === metadata.data.category_id).name} (${metadata.data.category_id})`);
      }
    }).catch((_) => {
      console.error("Failed to get image metadata, this account may not own the image.");
    });

    useAlertStore().addAlert("Recalled job parameters successfully!", "success");
    if(cb) {
      cb();
    }

    // Force propagate the prompt downward to LoRA related components so that they can be re-activated/reset
    //  (The LoRA activation syntax (should) always be in the positive prompt)
    loraSelector.value.forceActivateLoraFromPrompt(imageParams.value.options.prompt);
  }).catch((error) => {
    console.error("Failed to recall job parameters", error);
    useAlertStore().addAlert("Failed to recall job parameters, please try again later!", "error");
    if(onRecallFail) {
      onRecallFail();
    }
  });
}

const onClearRecallClick = () => {
  console.log("Clearing recalled image");
  recalledImageId.value = null;
  imageParams.value.options.seed = -1;
  imageParams.value.options.subseed = -1;
  imageParams.value.options.subseed_strength = null;
}

const getCategoryName = (categoryId) => {
  if(categoryId === null) {
    return "No category selected";
  }
  let category = categories.value.find((cat) => cat.id === categoryId);
  if(category) {
    return category.name;
  }
  return "Unknown category";
}

const stripBase64Prefix = (base64String) => {
  return base64String.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
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

  if(!isNaN(newValue.options.distilled_cfg)) {
    imageParams.value.options.distilled_cfg = Number(newValue.options.distilled_cfg);
  } else {
    imageParams.value.options.distilled_cfg = 3.5;
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

watch(img2imgParams, (newValue) => {
  if(newValue.inpainting) {
    useAlertStore().addAlert("Inpainting is an experimental feature and may not work as expected. Please use with caution!", "warning");
    loadInpaintingCanvas();
  }
}, {deep: true});

const loadInpaintingCanvas = () => {
  console.log("Loading inpainting canvas");
  const canvas = inpaintingCanvas.value;

  if(canvas === null) {
    console.error("Failed to locate inpainting canvas");
    return;
  }
  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.crossOrigin = 'anonymous';
  if(img2imgParams.value.startingInputJobId) {
    getImageForJob.value = getLinkForJobId(img2imgParams.value.startingInputJobId);
    img.src = getLinkForJobId(img2imgParams.value.startingInputJobId);
  } else {
    img.src = img2imgParams.value.startingInput;
  }
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
  };

  // We create a new canvas element to store the pattern
  const patternCanvas = document.createElement("canvas");
  const patternCtx = patternCanvas.getContext("2d");
  patternCanvas.width = 16;
  patternCanvas.height = 16;
  patternCtx.fillStyle = "#000";
  patternCtx.fillRect(0, 0, 8, 8);
  patternCtx.fillRect(8, 8, 8, 8);
  const pattern = ctx.createPattern(patternCanvas, "repeat");

  let isDrawing = false;
  let strokeWidth = 10;

  canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    ctx.beginPath();
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'; // Semi-transparent black
    ctx.fillStyle = pattern; // Checkerboard pattern
    ctx.moveTo(e.offsetX, e.offsetY);
  });

  canvas.addEventListener('mousemove', (e) => {
    if (isDrawing) {
      ctx.lineTo(e.offsetX, e.offsetY);
      ctx.stroke();
      ctx.fill();
    }
  });

  canvas.addEventListener('mouseup', () => {
    isDrawing = false;
  });
}

const destroyInpaintingCanvas = () => {
  console.log("Destroying inpainting canvas");
  const canvas = inpaintingCanvas.value;
  if(canvas === null) {
    console.error("Failed to locate inpainting canvas");
    return;
  }
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Find the "pattern" canvas and clear it
}

const getMaskFromCanvas = () => {
  const canvas = inpaintingCanvas.value;
  if(canvas === null) {
    console.error("Failed to locate inpainting canvas");
    return null;
  }
  const ctx = canvas.getContext("2d");
  // Create a shadow-canvas to store the mask
  const maskCanvas = document.createElement("canvas");
  const maskCtx = maskCanvas.getContext("2d");
  maskCanvas.width = canvas.width;
  maskCanvas.height = canvas.height;
  maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

  // Iterate over the canvas and create a mask
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < imgData.data.length; i += 4) {
    // If the pixel is black
    if(imgData.data[i] === 0 && imgData.data[i + 1] === 0 && imgData.data[i + 2] === 0) {
      maskCtx.fillStyle = 'black';
      maskCtx.fillRect((i / 4) % canvas.width, Math.floor((i / 4) / canvas.width), 1, 1);
    }
  }

  // Convert the mask canvas to a Base64 string
  const mask = maskCanvas.toDataURL("image/png").split(",")[1];
  console.log(mask);
  return mask;
}

const retrieveCategories = async () => {
  await getMyCategories().then((res) => {
    categories.value = res.data;
  }).catch((error) => {
    console.error("Failed to get categories", error);
  });
};

const onJobStarted = (data) => {
  let jobId = data.job_id;
  if(data.job_id === currentJobId.value) {
    console.log("Job started", jobId);
    progressText.value = "Job starting...";
  }
};

const onJobFailed = (data) => {
  let jobId = data.job_id;
  if(data.job_id === currentJobId.value) {
    console.error("Job failed", jobId);
    progressText.value = "Job failed!";
    currentProgress.value = null;
    currentJobId.value = null;
    isWorking.value = false;
  }
};

const setStartingInput = (event) => {
  // console.log("Setting starting input", event.target.files[0]);
  img2imgParams.value.startingInput = event.target.files[0];
  // Convert the file to a Base64 string
  const reader = new FileReader();
  reader.onload = (e) => {
    if(e.type === "load") {
      console.log("Converted starting input to Base64", e.target.result);
      // Ensure the file is a PNG image
      if(!e.target.result.startsWith("data:image/png;base64,")) {
        console.error("Invalid file selected!", e);
        useAlertStore().addAlert("This file cannot be used for img2img processing, please ensure you utilize a PNG image!", "error");
        return;
      }
      let img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        if(img.width * img.height > navigatorLimits.value.max_pixels) {
          console.error("Image exceeds maximum resolution", img.width, img.height);
          useAlertStore().addAlert(`This image exceeds the maximum pixel count of ${navigatorLimits.value.max_pixels}, please use a smaller image!`, "error");
          return;
        }
        console.log("Image dimensions", img.width, img.height);
        console.log("Image is eligible for img2img processing");
        img2imgParams.value.startingInput = e.target.result;
        imageParams.value.width = img.width;
        imageParams.value.height = img.height;
      };
    } else {
      console.error("Failed to convert starting input to Base64", e);
      useAlertStore().addAlert("Failed to process your image, please try again later!", "error");
    }
  };

  reader.onerror = (e) => {
    console.error("Failed to convert starting input to Base64", e);
    useAlertStore().addAlert("Failed to process your image, please try again later!", "error");
  };

  reader.readAsDataURL(event.target.files[0]);
};

const shareToCivitAI = () => {
  const imgUrl = `${import.meta.env.VITE_API_BASE}${lastJob.value.img_path}`
  console.log("Sharing to CivitAI: ", imgUrl);

  const civitAILink = `https://civitai.com/intent/post?mediaUrl=${encodeURIComponent(imgUrl)}`;
  window.open(civitAILink, '_blank');
}

const onLoraWordClicked = (word, isMutatingNegativePrompt) => {
  // Ensure we're working with the most up-to-date prompt and split into phrases
  const startingPrompt = isMutatingNegativePrompt ? imageParams.value.options.negative_prompt : imageParams.value.options.prompt;
  const currentWords = startingPrompt
      .split(',')
      .map((w) => w.trim()) // Remove leading/trailing whitespace
      .filter((w) => w.length > 0); // Filter out any empty entries from the split

  // Check if the clicked word/phrase already exists in the prompt
  const wordIndex = currentWords.findIndex((existingWord) => existingWord === word);

  if (wordIndex === -1) {
    // Word doesn't exist, so add it
    currentWords.push(word);
  } else {
    // Word exists, so remove it
    currentWords.splice(wordIndex, 1);
  }

  // Join the updated list back into a single comma-separated string
  if(!isMutatingNegativePrompt) {
    imageParams.value.options.prompt = currentWords.join(', ');
  } else {
    imageParams.value.options.negative_prompt = currentWords.join(', ');
  }
}

/**
 * This function takes care of two jobs effectively. It needs to receive new LoRA activation sequences and store the
 *  sequence (comes in as a single string of concatenated sequences) so that they can be appended to the prompt before
 *  sending the generation request.
 * It *also* needs to scan for these if they are in the prompt already and remove them as they will be in the prompt
 *    when an image is recalled (because the activation sequences will be in the image's prompt metadata).
 * Because prompts can come in quite a few different structures (they are user created after all), we have to really
 *  break down the entire prompt into minimal "tokens", search for the activation sequence(s) if found, remove it, then
 *  reassemble the prompt back to what the user will likely have entered.
 * All in all, it is a needed feature (otherwise recalled images will silently have duplicated activation sequences)
 *  but one that was VERY complex to write. Who would've thought?
 * @param loraSequences A single string of LoRA activation sequences passed in from the LoRA Selector component
 */
const onLoraUpdate = (loraSequences) => {
  loraPromptAddition.value = loraSequences;
  nextTick(() => {
    let currentPrompt = imageParams.value.options.prompt;

    // 1. Split the promptStr into individual LoRA entries
    const loraEntries = loraSequences.split(' ');

    // 2. Process each LoRA entry and remove it from the prompt
    loraEntries.forEach((loraEntry) => {
      // 3. Split the prompt into an array of phrases
      const phrases = currentPrompt.split(',');

      // 4. Process each phrase and remove the LoRA entry if found
      const filteredPhrases = phrases.map((phrase) => {
        const trimmedPhrase = phrase.trim();
        const words = trimmedPhrase.split(' ');

        // Filter out the LoRA entry from the words
        const filteredWords = words.filter((word) => word.trim() !== loraEntry.trim());

        // Join the remaining words back into a phrase
        return filteredWords.join(' ');
      });

      // 5. Filter out any empty phrases that might have resulted from removing the LoRA entry
      const finalPhrases = filteredPhrases.filter((phrase) => phrase.trim() !== "");

      // 6. Join the filtered phrases back into a string
      currentPrompt = finalPhrases.join(', ');
    });

    // 7. Update the prompt
    imageParams.value.options.prompt = currentPrompt;

    console.log("Filtered prompt:", imageParams.value.options.prompt);
  });
}

const deviceResolution = computed(() => {
  return { width: Math.floor((window.devicePixelRatio * window.screen.width) / 2), height: Math.floor((window.devicePixelRatio * window.screen.height) / 2) };
})

const isUsingDeviceResolution = computed(() => {
  // Return true if the current target width/height is already 2x of the deviceResolution
  if(imageParams.value.width === deviceResolution.value.width * 2 && imageParams.value.height === deviceResolution.value.height * 2) {
    return true;
  }
  // Return "true" if the full resolution (so x2 of `deviceResolution`) is over the Pixel limit, so that the label is hidden
  if((deviceResolution.value.width * 2) * (deviceResolution.value.height * 2) > navigatorLimits.value.max_pixels) {
    return true;
  }
  return deviceResolution.value.width === imageParams.value.width && deviceResolution.value.height === imageParams.value.height;
})

const applyScreenResolution = () => {
  // Apply half the resolution of the current device
  // We don't use the entire resolution since they can just upscale x2
  imageParams.value.width = deviceResolution.value.width;
  imageParams.value.height = deviceResolution.value.height;
}

watch(isWorking, (newValue) => {
  if(newValue === true) {
    console.debug("Starting job");
    maxProgress.value = imageParams.value.options.steps; // This should kick off the progress bar right away
    lastJob.value = null;
    isGenSettingsExpanded.value = false;
    isShowingLoraAdditions.value = false;
    loraSelector.value.forceCollapse();
  }
})

onMounted(async () => {
  toggleBodyScroll(showTipsModal.value);
  await initializeData();
  navigatorRt.on("task-started", onJobStarted);
  navigatorRt.on("task-progress", onJobProgress);
  navigatorRt.on("task-finished", onJobFinished);
  navigatorRt.on("model-changed", onRemoteModelChanging);
  navigatorRt.on("task-failed", onJobFailed);
  navigatorRt.on("connect", onConnect);
  navigatorRt.on("disconnect", onDisconnect);
  isConnectedToRt.value = navigatorRt.isSocketConnected;
  // Detect "recall" query parameter and attempt to recall job parameters
  if (router.currentRoute.value.query.recall) {
    console.log("Recalling job parameters from query", router.currentRoute.value.query.recall);
    recallJobParameters(router.currentRoute.value.query.recall);
    isGenSettingsExpanded.value = true;
  }

  // Detect "input" query parameter, and wire it up to the img2imgParams
  if (router.currentRoute.value.query.input) {
    console.log("Detected starting input from query", router.currentRoute.value.query.input);
    img2imgParams.value.startingInputJobId = router.currentRoute.value.query.input;
    recallJobParameters(router.currentRoute.value.query.input, null, false);
  }
  document.addEventListener('keydown', handleEscape);
});

onUnmounted(() => {
  toggleBodyScroll(false);
  navigatorRt.off("task-started", onJobStarted);
  navigatorRt.off("task-progress", onJobProgress);
  navigatorRt.off("task-finished", onJobFinished);
  navigatorRt.off("model-changed", onRemoteModelChanging);
  navigatorRt.off("task-failed", onJobFailed);
  navigatorRt.off("connect", onConnect);
  navigatorRt.off("disconnect", onDisconnect);
  document.removeEventListener('keydown', handleEscape);
});

const positivePromptArea = ref(null);
const negativePromptArea = ref(null);

const openFullscreenPreview = ref(false);
const openSettingsEmbed = ref(false);

const handleEscape = (event) => {
  if (event.key === 'Escape' && openFullscreenPreview.value) {
    openFullscreenPreview.value = false;
  }
}

function adjustHeight(element){
  element.style.height = "1px";
  element.style.height = (25+element.scrollHeight)+"px";
}
</script>

<template>
  <div>
    <!-- Img2Img is currently "soft disabled" -->
    <!-- FIXME: Img2Img seems to be broken, the API returns a 422 error, Forge API changed possibly? -->
    <!-- After investigating and fixing, remove the v-if directive below -->
    <div v-if="isImg2Img" role="tablist" class="tabs tabs-boxed sm:w-3/4 md:w-1/2 m-4 ml-auto mr-auto items-center">
      <RouterLink :to="{ name: 'txt2img' }" class="tab" active-class="tab-active" role="tab">Txt2Img</RouterLink>
      <RouterLink :to="{ name: 'img2img' }" class="tab" active-class="tab-active" role="tab">Img2Img</RouterLink>
    </div>
    <div class="grid grid-cols-12">
      <div class="col-span-12 md:col-span-9 max-md:pb-5">
        <div class="prompt-container col-span-12 md:col-span-9 order-1">
          <div class="form-control border-2 border-opacity-90 border-zinc-700 cornered">
            <span class="label justify-normal ms-2">Prompting
              <oh-vue-icon @click="showTipsModal = true" name="hi-information-circle" class="ml-2"/>
              <span v-if="!lorasResolved" class="italic text-sm text-neutral-500 align-middle">&nbsp; Resolving LoRAs... <span class="loading loading-dots align-middle"></span></span>
              <span v-if="isWorking" class="italic text-sm text-neutral-500 align-middle">&nbsp; Generating... <span class="loading loading-dots align-middle"></span></span>
            </span>
            <span v-if="isImg2Img" class="m-3 text-sm text-warning">When using Img2Img, you should try to use a prompt that describes the original image (preferably the original!), while incorporating the changes you wish to see.</span>
            <span v-if="getPredefinedPrompts.length > 0" class="m-4 text-sm italic">To apply a predefined prompt, choose one below:</span>
            <div v-if="getPredefinedPrompts.length > 0" class="row">
              <select v-model="selectedPredefinedPrompt" class="m-3 select select-bordered w-2/3 md:w-2/3 lg:w-2/3 xl:w-1/5">
                <option v-for="prompt in getPredefinedPrompts" :key="prompt.id" :value="prompt">{{ prompt.name }}</option>
              </select>
              <button class="btn btn-success" @click="applyPredefinedPrompt">Apply</button>
            </div>
            <textarea ref="positivePromptArea" :disabled="recalledImageId !== null" @change="adjustHeight($event.target)" @keyup="adjustHeight($event.target)" v-model="imageParams.options.prompt" class="textarea h-24 textarea-bordered m-3" placeholder="Enter your prompt here! What do you want to see in the image?"></textarea>
            <textarea ref="negativePromptArea" id="negativePrompt" @change="adjustHeight($event.target)" @keyup="adjustHeight($event.target)" :disabled="recalledImageId !== null" v-model="imageParams.options.negative_prompt" class="textarea h-24 textarea-bordered m-3" placeholder="Optionally, enter a negative prompt - which describes what you don't want to see in the image."></textarea>
            <span v-if="!isRandomized && !recalledImageId" @click="onRandomizationClick" class="m-3 mt-1 text-sm text-accent cursor-pointer">Note: You have a seed set, click to randomize this.</span>
            <span v-if="recalledImageId !== null" class="m-3 mt-1 text-sm text-error">Warning: You have a recalled image active, the prompt and other settings cannot be changed as changing the settings would cause variations to be invalid. Clear the recalled image in "Generation Settings" to unlock editing of these.</span>
            <LoraSelector ref="loraSelector" :disabled="recalledImageId !== null" :prompt="imageParams.options.prompt" :negative-prompt="imageParams.options.negative_prompt" @lorasRefreshing="lorasResolved = false" @lorasResolved="lorasResolved = true" @onWordClicked="onLoraWordClicked" @loraUpdated="onLoraUpdate" class="m-2" />
            <p v-if="loraPromptAddition.length > 0 && isShowingLoraAdditions" class="text-sm italic text-gray-400 m-2" @click="isShowingLoraAdditions = !isShowingLoraAdditions">The following will automatically be appended to your prompt due to your LoRA choices: {{loraPromptAddition}}</p>
            <p v-else-if="!isShowingLoraAdditions && loraPromptAddition.length > 0" class="text-sm italic text-gray-400 m-2" @click="isShowingLoraAdditions = !isShowingLoraAdditions">LoRA text will automatically be appended to your prompt, click to show</p>
          </div>
        </div>
      </div>
      <div class="generate-button-container pt-0 m-3 md:pt-10 col-span-12 md:col-span-3">
        <div class="row mb-2">
          <button v-if="isRandomized" @click="sendJobToNavigator" :disabled="isWorking || !isConnectedToRt || !isImageParamsValid" class="btn btn-success forced-glow w-full mb-5">Generate</button>
          <button v-else @click="sendJobToNavigator" :disabled="isWorking || !isConnectedToRt || !isImageParamsValid" class="btn btn-success forced-glow w-full">Regenerate From Seed</button>
          <div v-if="!isRandomized" class="row join w-full py-2">
            <button :disabled="isWorking || !isConnectedToRt || !isImageParamsValid" class="btn btn-accent btn-outline join-item w-1/2 glow-hover" @click="onNewVariationClick(0.3)">Generate Subtle Variation</button>
            <button :disabled="isWorking || !isConnectedToRt || !isImageParamsValid" class="btn btn-accent btn-outline join-item w-1/2 glow-hover" @click="onNewVariationClick(0.7)">Generate Strong Variation</button>
          </div>
          <button :disabled="!isInterruptible" @click="onInterruptClicked" class="btn btn-error text-white text-opacity-100 w-full mb-5">Interrupt / Cancel</button>
        </div>
        <div class="row">
          <h3 class="text-center text-lg font-bold">Status</h3>
          <p class="text-center mt-2">{{progressText}}</p>
          <progress v-if="isWorking" class="progress w-full" :class="progressClasses" :value="currentProgress" :max="maxProgress"></progress>
        </div>
      </div>
    </div>
    <div class="grid grid-cols-12 gap-2">
      <!-- "Left" side of page -->
      <div class="col-span-12 md:col-span-9">
        <div v-if="isImg2Img" class="mt-5" id="img2img">
          <div class="form-control border-2 border-opacity-90 border-zinc-700 cornered">
            <span class="label ms-2">Starting Input</span>
            <div class="m-3">
              <img v-if="img2imgParams.startingInputJobId !== null" class="m-3 w-3/4 md:w-1/2 lg:w-1/6" :src="getLinkForJobId(img2imgParams.startingInputJobId)" alt="Starting Input" />
              <span v-if="img2imgParams.startingInputJobId !== null" class="label">Reference image ID: {{img2imgParams.startingInputJobId}}</span>
              <span v-if="img2imgParams.startingInputJobId !== null" class="label italic text-success">You're using a previous job as a starting point. You can also choose to utilize a custom uploaded image by clearing the input below.</span>
              <img v-if="img2imgParams.startingInput !== null" class="m-3 w-3/4 md:w-1/2 lg:w-1/6" :src="getPreviewOfFile" alt="Starting Input" />
              <input v-if="img2imgParams.startingInputJobId === null" type="file" @change="setStartingInput" class="m-3 file-input file-input-bordered file-input-success w-full max-w-xs" /><br/>
              <button @click="img2imgParams.startingInputJobId = null; img2imgParams.startingInput = null; imageParams.options.seed = -1" class="m-3 btn btn-info">Clear Input</button>
            </div>
          </div>
        </div>
        <div v-if="isImg2Img" class="mt-5" id="img2img-inpainting">
          <div class="form-control border-2 border-opacity-90 border-zinc-700 cornered">
            <span class="label ms-2">Inpainting</span>
            <div class="m-3">
              <label class="cursor-pointer">
                <input v-model="img2imgParams.inpainting" class="align-middle checkbox checkbox-secondary" type="checkbox" />
                <span class="ms-2 align-middle">Enable Inpainting?</span>
                <span class="ms-2 align-middle text-warning italic">Experimental - Not suitable for mobile!</span>
              </label>
              <span class="label mt-2">Inpainting is a technique to select parts of an image for replacement. This can be useful for replacing unwanted objects or artifacts from an image.</span>
              <button v-if="img2imgParams.inpainting" @click="getMaskFromCanvas" class="m-3 btn btn-info">Get Mask</button>
              <canvas v-show="img2imgParams.inpainting" ref="inpaintingCanvas" class="m-3 border border-opacity-90 border-gray-700 cornered"></canvas>
            </div>
          </div>
        </div>
        <div class="mt-5">
          <div class="form-control border-2 border-opacity-100 col-span-12 md:col-span-9 border-zinc-700 cornered">
            <span v-show="isGenSettingsExpanded" @click="toggleGenSettings" class="label ms-2">Generation Settings</span>
            <span v-show="!isGenSettingsExpanded" @click="toggleGenSettings" class="label ms-2">Generation Settings (Hidden; Click to expand)</span>
            <div v-show="recalledImageId !== null && isGenSettingsExpanded" class="m-3">
              <span>Recalled image ID: {{recalledImageId}}</span>
              <img v-if="recalledImageId !== null" class="md:w-1/2 xl:w-1/4 rounded-md drop-shadow-lg mt-3" :src="getLinkForJobId(recalledImageId)" alt="Recalled Image" />
              <div class="grid grid-cols-2 gap-4 xl:w-1/4 mt-3">
                <button @click="onClearRecallClick" class="btn btn-info">Clear Recall</button>
                <button @click="onRecallVariationClick(0.3)" :disabled="isWorking" class="btn btn-accent glow-hover">Vary (Weak)</button>
                <button @click="onRecallVariationClick(0.7)" :disabled="isWorking" class="btn btn-accent glow-hover">Vary (Strong)</button>
                <button @click="onRecallUpscaleClick" :disabled="!isRecalledImageEligibleForUpscale || isWorking" class="btn btn-secondary forced-glow">Upscale 2x</button>
              </div>
            </div>
            <div v-show="recalledImageId === null && isGenSettingsExpanded" class="m-3">
              <span>You do not currently have an image recalled. Enter an Image ID below to recall:</span><br/>
              <input v-model="recallTextEntry" type="text" class="mt-4 input input-md input-bordered"/>
              <button :disabled="isWorking || !recallTextEntry" class="ml-1 mb-2 btn btn-primary" @click="onRecallClick">Recall</button><br/>
              <span v-if="recallEntryFailed" class="text-sm text-error">The specified Image ID could not be recalled. The image may not exist, or Navigator encountered an issue attempting to check the metadata.</span>
              <span v-if="!recallEntryFailed" class="text-sm text-gray-400 italic">Note: Upon a successful recall, any current generation parameters will be overwritten.</span>
            </div>
            <div v-show="isGenSettingsExpanded" class="m-3">
              <div>
                <label class="label">Category</label>
                <CategorySelect :category-id="imageParams.categoryId" @onCategorySelected="onCategorySelected" allow-modify="true" />
                <label v-if="imageParams.categoryId !== null" class="label">This image will be categorized under: {{getCategoryName(imageParams.categoryId)}}</label>
                <label v-else class="label">This image will not be categorized.</label>
              </div>
              <div class="form-control">
                <label class="label">Target Width</label>
                <div class="grid grid-cols-12 gap-4">
                  <input :disabled="recalledImageId !== null" v-model="imageParams.width" type="range" :class="rangeColorClasses" class="col-span-8 md:col-span-10 range" step="64" min="64" max="4096" />
                  <input :disabled="recalledImageId !== null" v-model="imageParams.width" type="number" class="col-span-4 md:col-span-2  md:w-3/4 input input-primary" @blur="validateImageSizeParams" />
                </div>
              </div>
              <div class="form-control pb-3">
                <label class="label">Target Height</label>
                <div class="grid grid-cols-12 gap-4">
                  <input :disabled="recalledImageId !== null" v-model="imageParams.height" type="range" :class="rangeColorClasses" class="col-span-8 md:col-span-10 range" step="64" min="64" max="4096" />
                  <input :disabled="recalledImageId !== null" v-model="imageParams.height" type="number" class="col-span-4 md:col-span-2 md:w-3/4 input input-primary" @blur="validateImageSizeParams" />
                </div>
                <span v-if="!isUsingDeviceResolution && !doesSizeExceedLimit && !isImg2Img" class="text-sm text-success cursor-pointer mt-3" @click="applyScreenResolution">Looking to make a wallpaper? Click here to apply half of your device's screen resolution.</span>
                <span v-if="!isUsingDeviceResolution && !doesSizeExceedLimit && !isImg2Img" class="text-sm text-success cursor-pointer mt-3 mb-3" @click="applyScreenResolution">(It can then be upscaled to the full resolution)</span>
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
                <select :disabled="recalledImageId !== null" id="model-selector" v-model="imageParams.options.model" class="select neutral-border mb-2">
                  <option v-for="model in availableModels" :value="model" :key="model.model_name">{{model.friendly_name ? model.friendly_name : model.model_name}}</option>
                </select>
              </div>
              <div class="form-control">
                <label class="mb-2">
                  <span class="ms-2">Additional Modules</span>
                </label>
                <select @change="onAddModule" :disabled="recalledImageId !== null || availableAdditionalModules.length === 0" v-model="selectedAdditionalModule" class="select neutral-border mb-2">
                  <option value="" disabled selected>Select a module</option>
                  <option v-if="availableAdditionalModules.length === 0" disabled>No available additional modules</option>
                  <option v-for="module in availableAdditionalModules" :value="module.model_name" :key="module.model_name">{{module.model_name}}</option>
                </select>
              </div>
              <div v-if="enabledAdditionalModules.length" class="mt-4 flex flex-wrap gap-2 mb-4">
                <span v-for="module in enabledAdditionalModules" :key="module.filename" class="badge badge-lg badge-primary gap-2">
                  <svg v-if="recalledImageId === null" @click="onRemoveModule(module.model_name)" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block h-4 w-4 stroke-current cursor-pointer">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                  {{ module.model_name }}
                </span>
              </div>
              <div class="form-control">
                <label class="cursor-pointer mb-2 mt-2">
                  <input type="checkbox" :disabled="recalledImageId !== null" v-model="imageParams.options.image_enhancements" class="checkbox checkbox-primary align-middle">
                  <span class="ms-2">Enable Image Enhancements?</span>
                </label>
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
                <select :disabled="recalledImageId !== null" v-model="imageParams.options.sampler" class="select neutral-border mb-2">
                  <option v-for="sampler in availableSamplers" :value="sampler" :key="sampler.name">{{sampler.name}}</option>
                </select>
              </div>
              <div v-if="showAdvancedOptions" class="form-control">
                <label class="mb-2">
                  <span class="ms-2">Scheduler</span>
                </label>
                <select :disabled="recalledImageId !== null" v-model="imageParams.options.scheduler" class="select neutral-border mb-2">
                  <option v-for="scheduler in availableSchedulers" :value="scheduler" :key="scheduler.name">{{scheduler.label}}</option>
                </select>
              </div>
              <div v-if="showAdvancedOptions" class="form-control">
                <label class="cursor-pointer mb-2">
                  <span class="ms-2">Steps</span>
                </label>
                <input :disabled="recalledImageId !== null" v-model="imageParams.options.steps" class="input w-1/2 md:w-1/4 lg:w-1/12 neutral-border" type="number" min="1" max="75" />
              </div>
              <div v-if="showAdvancedOptions" class="form-control mt-2">
                <label class="cursor-pointer mb-2">
                  <span class="ms-2 align-middle">CFG Scale &nbsp;</span>
                </label>
                <input :disabled="recalledImageId !== null" v-model="imageParams.options.cfg_scale" class="align-middle w-1/2 md:w-1/4 lg:w-1/12 neutral-border input" type="number" />
              </div>
              <div v-if="showAdvancedOptions" class="form-control mt-2">
                <label class="cursor-pointer mb-2">
                  <span class="ms-2 align-middle">Distilled CFG Scale &nbsp;</span>
                </label>
                <input :disabled="recalledImageId !== null" v-model="imageParams.options.distilled_cfg" class="align-middle w-1/2 md:w-1/4 lg:w-1/12 neutral-border input" type="number" />
              </div>
              <div v-if="showAdvancedOptions" class="form-control mt-2 grid grid-cols-12 gap-2">
                <label class="cursor-pointer row col-span-12">
                  <span class="ms-2 align-middle">Seed &nbsp;</span>
                </label>
                <input :disabled="recalledImageId !== null" v-model="imageParams.options.seed" class="col-span-12 md:col-span-3 align-middle neutral-border input" type="number" />
                <button :disabled="recalledImageId !== null" @click="onRandomizationClick" class="col-span-12 md:col-span-3 btn btn-secondary">Randomize Seed</button>
              </div>
              <div v-if="showAdvancedOptions && (imageParams.options.subseed !== -1 || imageParams.options.subseed !== null)" class="form-control mt-2 grid grid-cols-12 gap-2">
                <label class="cursor-pointer row col-span-12">
                  <span class="ms-2 align-middle">Variation Seed &nbsp;</span>
                </label>
                <div class="row">
                  <input v-model="imageParams.options.subseed" disabled class="align-middle neutral-border input" type="number" />
                </div>
              </div>
              <div v-if="showAdvancedOptions && imageParams.options.subseed_strength !== null" class="form-control mt-2 mb-2 grid grid-cols-12 gap-2">
                <label class="cursor-pointer row col-span-12">
                  <span class="ms-2 align-middle">Variation Strength &nbsp;</span>
                </label>
                <div class="row">
                  <input v-model="imageParams.options.subseed_strength" disabled class="align-middle neutral-border input" type="number" />
                </div>
              </div>
              <span v-if="showAdvancedOptions && recalledImageId !== null && (imageParams.options.subseed !== -1 || imageParams.options.subseed_strength !== null)" class="text-sm mt-8">Note: Clear the recalled image to remove the above Variation settings.</span>
            </div>
          </div>
        </div>
        <div class="mt-5">
          <div class="generated-image-container border-2 border-opacity-90 border-zinc-700 cornered h-full">
            <span class="label ms-2">Results</span>
            <!--suppress HtmlUnknownTag -->
            <!--              <div class="pl-2 pr-8 m-3 w-full">-->
            <div class="mx-auto max-w-3xl md:max-h-[60vh] overflow-auto p-2">
              <img v-if="lastJob && (lastJob.status === 'completed' || lastJob.status === 'in_progress')" id="job-image" @click="openFullscreenPreview = true" :src="getImageForJob" alt="Generated Image" class="w-full h-auto object-contain rounded-lg drop-shadow-lg" />
            </div>
            <transition name="fullview">
              <div v-show="openFullscreenPreview" @click.self="openFullscreenPreview = false" class="fixed inset-0 flex items-center justify-center bg-base-200 bg-opacity-50 z-10 backdrop-blur-lg">
                <div class="modal-content rounded-lg w-fit mx-4 drop-shadow-lg">
                  <p class="text-center font-bold m-2">Click image (or outside of image) to dismiss</p>
                  <img
                      class="max-w-full max-h-[75vh] object-contain ml-auto mr-auto rounded-xl drop-shadow-xl"
                      @click="openFullscreenPreview = false"
                      :src="getImageForJob"
                      alt="Generated Image"/>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>

      <!-- "Right" side of page -->
      <div class="col-span-12 md:col-span-3">
        <div class="generated-image-metadata-container pt-0 m-3 md:pt-10">
          <div class="form-control cornered" :class="{'glow': (lastJob && lastJob.status === 'completed')}">
            <p class="mt-2 text-center w-full">Post-processing</p>
            <div class="m-3">
              <button :disabled="isWorking || !lastJob || lastJob.status !== 'completed'" @click="saveLastJobImage" class="btn btn-success w-full relative forced-glow"><oh-vue-icon animation="float" class="size-6" name="fa-download"/>&nbsp;Download Image</button>
              <button :disabled="isWorking || !lastJob || lastJob.status !== 'completed'" @click="copyImageLink" class="btn btn-info w-full mt-2 relative"><oh-vue-icon class="size-7" animation="wrench" name="hi-clipboard-copy"/>&nbsp;Copy Image Link</button>
              <button v-if="!isDeletePending" :disabled="isWorking || !lastJob || lastJob.status !== 'completed'" @click="onDeleteClick" class="btn btn-error w-full mt-2 relative"><oh-vue-icon class="size-7" name="md-deleteforever"/>&nbsp; Delete Image</button>
              <button v-else :disabled="isWorking || !lastJob || lastJob.status !== 'completed'" @click="onDeleteClick" class="btn btn-error w-full mt-2 relative"><oh-vue-icon class="size-7" name="md-deleteforever"/><strong>&nbsp;Click To Confirm</strong></button>
              <!--            <button v-if="!isImg2Img" :disabled="!lastJob || lastJob.status !== 'completed'" @click="recallLastJob" class="btn btn-primary w-full mt-2 relative"><oh-vue-icon class="size-6" animation="spin" name="md-replaycirclefilled"/>&nbsp; Recall Parameters</button>-->
              <button v-if="settings.getSetting('shareToCivitAI') === true" :disabled="isWorking || !lastJob || lastJob.status !== 'completed'" @click="shareToCivitAI" class="btn btn-primary w-full mt-2 relative glow-hover"><oh-vue-icon class="size-6" name="ri-share-box-fill"/>Share to CivitAI</button>
              <button v-if="!img2imgParams.inpainting" :disabled="isWorking || !lastJob || lastJob.status !== 'completed'" @click="onVariationClick(0.3)" class="btn btn-accent w-full mt-2 relative glow-hover"><oh-vue-icon class="size-6" animation="pulse" name="gi-perspective-dice-six-faces-random"/>&nbsp; Variation (Subtle)</button>
              <button v-if="!img2imgParams.inpainting" :disabled="isWorking || !lastJob || lastJob.status !== 'completed'" @click="onVariationClick(0.7)" class="btn btn-accent w-full mt-2 relative glow-hover"><oh-vue-icon class="size-6" animation="pulse" name="gi-perspective-dice-six-faces-random"/>&nbsp; Variation (Strong)</button>
              <button v-if="!isImg2Img" :disabled="isWorking || !lastJob || lastJob.status !== 'completed' || !isEligibleForUpscale" @click="onUpscaleClick" class="btn btn-secondary w-full mt-2 relative forced-glow"><oh-vue-icon class="size-6" animation="pulse" name="fa-angle-double-up"/>&nbsp;Recall & Upscale 2x</button>
              <button class="btn btn-ghost btn-outline w-full mt-2 relative" @click="openSettingsEmbed = true"><oh-vue-icon name="io-settings" />&nbsp; Open Settings</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="showTipsModal" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
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
    <transition name="fade">
      <div v-show="openSettingsEmbed" @click.self="openSettingsEmbed = false" class="fixed inset-0 flex items-center justify-center bg-base-200 bg-opacity-90 z-10 backdrop-blur-lg">
        <transition name="zoom">
          <div class="modal-content rounded-lg w-3/4 mx-4 drop-shadow-lg border-2 border-opacity-90 border-zinc-700">
            <p class="text-center font-bold m-2">Click outside to dismiss</p>
            <!-- TODO: Make the category-id a ref so that this dialog can be reused for other settings -->
            <SettingsView :is-embedded="true" :category-id="'image-generation'" />
          </div>
        </transition>
      </div>
    </transition>
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

input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type=number] {
  -moz-appearance:textfield;
  appearance: textfield;
}

textarea, textarea::placeholder {
  resize: block;
  color: #a5efa5;
}

textarea:disabled {
  color: #597259;
}

textarea::placeholder {
  font-size: 1.2em;
}

#negativePrompt {
  font-size: unset !important;
  color: #f6c7c7;
  opacity: 0.7;
}

#negativePrompt::placeholder {
  font-size: 0.9rem;
  color: #ffd1d1;
  opacity: 0.8;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.zoom-enter-active, .zoom-leave-active {
  transition: all 0.3s ease;
}
.zoom-enter-from, .zoom-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
.zoom-enter-to, .zoom-leave-from {
  opacity: 1;
  transform: scale(1);
}

.fullview-enter-active, .fullview-leave-active {
  transition: all 0.2s ease-in-out;
}
.fullview-enter-from, .fullview-leave-to {
  opacity: 0;
  transform: scale(0.8) translateY(1rem);
}
.fullview-enter-to, .fullview-leave-from {
  opacity: 1;
  transform: scale(1) translateY(0);
}
</style>
