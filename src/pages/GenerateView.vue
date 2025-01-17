<script setup>
import {computed, inject, onMounted, onUnmounted, ref, toRaw, watch} from "vue";
import { OhVueIcon } from "oh-vue-icons";
import {
  generateImg2Img,
  generateTxt2Img,
  getAvailableModels,
  getAvailableSamplers,
  getImageInfo, getMetadataForImage, getMyCategories,
  interruptJob, upscaleImageWithHR
} from "@/services/NavigatorService";
import {useAlertStore} from "@/stores/alerts";
import SizePreviewBox from "@/components/SizePreviewBox.vue";
import {useRouter} from "vue-router";
import {saveAs} from "file-saver";
import {deleteImage} from "@/services/UserService";
import CategorySelect from "@/components/CategorySelect.vue";
import {useSettingsStore} from "@/stores/settings";

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
    steps: 50,
    cfg_scale: 7.0,
    seed: -1,
    subseed: -1,
    subseed_strength: null,
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

const recallTextEntry = ref(null);

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

const isImg2Img = computed(() => {
  return router.currentRoute.value.name === "img2img";
});

const inpaintingCanvas = ref(null);

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

const selectedPredefinedPrompt = ref({});

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

const onCategorySelected = (categoryId) => {
  console.log("Selected category", getCategoryName(categoryId), categoryId);
  imageParams.value.categoryId = categoryId;
};

const isInterruptible = computed(() => {
  return (currentJobId.value && currentProgress.value);
});

const isEligibleForUpscale = computed(() => {
  if(!lastJob.value) return false;
  const upscaledWidth = lastJob.value.width * 2;
  const upscaledHeight = lastJob.value.height * 2;
  return (upscaledWidth * upscaledHeight) <= (2560 * 1440);
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

  await retrieveCategories();
  console.log("Done loading initial data");

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
      categoryId: imageParams.value.categoryId
    };
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

    if(!isImg2Img.value) {
      generateTxt2Img(job).then((resp) => {
        console.log("Sent image request to Navigator", resp.data);
        currentJobId.value = resp.data.job_id;
        progressText.value = "Job queued, waiting to be picked up by Navigator...";
        lastJob.value = { ... job, status: 'queued', job_id: resp.data.job_id };
        isGenSettingsExpanded.value = false;
        // TODO: Handle queue status
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
  upscaleImageWithHR(jobId).then((resp) => {
    console.log("Sent upscale request to Navigator", resp.data);
    currentJobId.value = resp.data.job_id;
    progressText.value = "Job queued, waiting to be picked up by Navigator...";
    lastJob.value = { status: 'queued', job_id: resp.data.job_id};
    isGenSettingsExpanded.value = false;
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

// Variation is a number between 0 and 1
// 0 is the weakest variation (barely any change), 1 is the strongest (most change)
const onVariationClick = (variation) => {
  console.log("Clicked on variation", variation);
  recallLastJob(() => {
    imageParams.value.options.subseed = -1;
    imageParams.value.options.subseed_strength = variation;
    setTimeout(() => {
      sendJobToNavigator();
    }, 500);
  })
}

const onUpscaleClick = () => {
  console.log("Upscaling image");
  recallLastJob(() => {
    sendUpscaleJobToNavigator(lastJob.value.job_id);
    // After the user has upscaled the image, they probably don't want to re-generate the base image
    // on the next run, so reset the seed to -1
    imageParams.value.options.seed = -1;
    imageParams.value.options.subseed = null;
    imageParams.value.options.subseed_strength = null;
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
      console.error("Image is not eligible for upscaling!");
      return;
    }
    sendUpscaleJobToNavigator(recalledImageId.value);
    imageParams.value.options.seed = -1;
    imageParams.value.options.subseed = null;
    imageParams.value.options.subseed_strength = null;
  });
}

const onRecallVariationClick = (variation) => {
  console.log("Recalling and varying image", variation);
  recallJobParameters(recalledImageId.value, () => {
    imageParams.value.options.subseed_strength = variation;
    imageParams.value.options.subseed = -1;
    setTimeout(() => {
      sendJobToNavigator();
    }, 500);
  });
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

    const subseed = params["Variation seed"];
    const subseedStrength = params["Variation seed strength"];

    if(subseed) {
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
    // the targeted upscaled image must be less than or equal to 2560x1440
    const upscaledWidth = imageParams.value.width * 2;
    const upscaledHeight = imageParams.value.height * 2;
    isRecalledImageEligibleForUpscale.value = upscaledWidth * upscaledHeight <= (2560 * 1440);

    imageParams.value.options.cfg_scale = params["CFG scale"];
    imageParams.value.options.seed = params.Seed;

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
        if(img.width * img.height > (2560 * 1440)) {
          console.error("Image exceeds maximum resolution", img.width, img.height);
          useAlertStore().addAlert("This image exceeds the maximum resolution of 2560x1440, please use a smaller image!", "error");
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
});
</script>

<template>
  <div>
    <div role="tablist" class="tabs tabs-boxed sm:w-3/4 md:w-1/2 m-4 ml-auto mr-auto items-center">
      <RouterLink :to="{ name: 'txt2img' }" class="tab" active-class="tab-active" role="tab">Txt2Img</RouterLink>
      <RouterLink :to="{ name: 'img2img' }" class="tab" active-class="tab-active" role="tab">Img2Img</RouterLink>
    </div>
    <div class="grid grid-cols-12 gap-4">
      <div class="prompt-container col-span-12 md:col-span-9">
        <div class="form-control border border-opacity-50 border-gray-500 cornered">
          <span class="label justify-normal ms-2 flex items-center">Prompting
            <oh-vue-icon @click="showTipsModal = true" name="hi-information-circle" class="ml-2"/>
          </span>
          <span v-if="isImg2Img" class="m-3 text-sm text-warning">When using Img2Img, you should try to use a prompt that describes the original image (preferably the original!), while incorporating the changes you wish to see.</span>
          <span v-if="getPredefinedPrompts.length > 0" class="m-4 text-sm italic">To apply a predefined prompt, choose one below:</span>
          <div v-if="getPredefinedPrompts.length > 0" class="row">
            <select v-model="selectedPredefinedPrompt" class="m-3 select select-bordered w-2/3 md:w-2/3 lg:w-2/3 xl:w-1/5">
              <option v-for="prompt in getPredefinedPrompts" :key="prompt.id" :value="prompt">{{ prompt.name }}</option>
            </select>
            <button class="btn btn-success" @click="applyPredefinedPrompt">Apply</button>
          </div>
          <textarea :disabled="recalledImageId !== null" v-model="imageParams.options.prompt" class="textarea h-24 textarea-bordered m-3" placeholder="Enter your prompt here! What do you want to see in the image?"></textarea>
          <textarea :disabled="recalledImageId !== null" v-model="imageParams.options.negative_prompt" class="textarea h-24 textarea-bordered m-3" placeholder="Optionally, enter a negative prompt - which describes what you don't want to see in the image."></textarea>
          <span v-if="imageParams.options.seed !== -1" class="m-3 mt-1 text-sm text-accent">Note: You have a seed set, visit "Generation Settings" => Advanced Options to change/randomize this.</span>
          <span v-if="recalledImageId !== null" class="m-3 mt-1 text-sm text-error">Warning: You have a recalled image active, the prompt and other settings cannot be changed as changing the settings would cause variations to be invalid. Clear the recalled image in "Generation Settings" to unlock editing of these.</span>
        </div>
      </div>
      <div class="generate-button-container col-span-12 md:col-span-3 pt-0 m-3 md:pt-10">
        <div class="row mb-2">
          <button v-if="isImageParamsValid" @click="sendJobToNavigator" :disabled="isWorking || !isConnectedToRt" class="btn btn-success w-full mb-5">Generate</button>
          <button v-else class="btn btn-disabled text-opacity-100 w-full mb-5">Generate</button>
          <button :disabled="!isInterruptible" @click="onInterruptClicked" class="btn btn-error text-white text-opacity-100 w-full">Interrupt / Cancel</button>
        </div>
        <div class="row">
          <h3 class="text-center text-lg font-bold">Status</h3>
          <p class="text-center mt-2">{{progressText}}</p>
          <progress v-if="currentJobId !== null" class="progress w-full" :class="progressClasses" :value="currentProgress" :max="maxProgress"></progress>
        </div>
      </div>
    </div>
    <div v-if="isImg2Img" class="mt-5" id="img2img">
      <div class="form-control border border-opacity-50 border-gray-500 cornered">
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
      <div class="form-control border border-opacity-50 border-gray-500 cornered">
        <span class="label ms-2">Inpainting</span>
        <div class="m-3">
          <label class="cursor-pointer">
            <input v-model="img2imgParams.inpainting" class="align-middle checkbox checkbox-secondary" type="checkbox" />
            <span class="ms-2 align-middle">Enable Inpainting?</span>
            <span class="ms-2 align-middle text-warning italic">Experimental - Not suitable for mobile!</span>
          </label>
          <span class="label mt-2">Inpainting is a technique to select parts of an image for replacement. This can be useful for replacing unwanted objects or artifacts from an image.</span>
          <button v-if="img2imgParams.inpainting" @click="getMaskFromCanvas" class="m-3 btn btn-info">Get Mask</button>
          <canvas v-show="img2imgParams.inpainting" ref="inpaintingCanvas" class="m-3 border border-opacity-50 border-gray-500 cornered"></canvas>
        </div>
      </div>
    </div>
    <div class="mt-5">
      <div class="form-control border border-opacity-50 border-gray-500 cornered">
        <span v-show="isGenSettingsExpanded" @click="toggleGenSettings" class="label ms-2">Generation Settings</span>
        <span v-show="!isGenSettingsExpanded" @click="toggleGenSettings" class="label ms-2">Generation Settings (Hidden; Click to expand)</span>
        <div v-show="recalledImageId !== null && isGenSettingsExpanded" class="m-3">
          <span>Recalled image ID: {{recalledImageId}}</span>
          <img v-if="recalledImageId !== null" class="m-3 w-3/4 md:w-1/2 lg:w-1/6" :src="getLinkForJobId(recalledImageId)" alt="Recalled Image" />
          <button @click="onClearRecallClick" class="m-3 btn btn-info">Clear Recall</button>
          <button @click="onRecallVariationClick(0.3)" :disabled="isWorking" class="m-3 btn btn-accent">Vary (Weak)</button>
          <button @click="onRecallVariationClick(0.7)" :disabled="isWorking" class="m-3 btn btn-accent">Vary (Strong)</button>
          <button @click="onRecallUpscaleClick" :disabled="!isRecalledImageEligibleForUpscale || isWorking" class="m-3 btn btn-secondary">Upscale 2x</button>
        </div>
        <div v-show="recalledImageId === null && isGenSettingsExpanded" class="m-3">
          <span>You do not currently have an image recalled. Enter an Image ID below to recall:</span><br/>
          <input v-model="recallTextEntry" type="text" class="mt-4 input input-md input-primary"/>
          <button :disabled="isWorking" class="ml-1 mb-2 btn btn-primary" @click="onRecallClick">Recall</button><br/>
          <span v-if="recallEntryFailed" class="text-sm text-error">The specified Image ID could not be recalled. The image may not exist, or Navigator encountered an issue attempting to check the metadata.</span>
          <span v-if="!recallEntryFailed" class="text-sm text-gray-500 italic">Note: Upon a successful recall, any current generation parameters will be overwritten.</span>
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
              <input disabled v-model="imageParams.width" type="range" :class="rangeColorClasses" class="col-span-8 md:col-span-10 range" min="64" max="4096" />
              <input :disabled="recalledImageId !== null" v-model="imageParams.width" type="number" class="col-span-4 md:col-span-2  md:w-3/4 input input-primary" @blur="validateImageSizeParams" />
            </div>
          </div>
          <div class="form-control pb-3">
            <label class="label">Target Height</label>
            <div class="grid grid-cols-12 gap-4">
              <input disabled v-model="imageParams.height" type="range" :class="rangeColorClasses" class="col-span-8 md:col-span-10 range" min="64" max="4096" />
              <input :disabled="recalledImageId !== null" v-model="imageParams.height" type="number" class="col-span-4 md:col-span-2 md:w-3/4 input input-primary" @blur="validateImageSizeParams" />
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
            <select :disabled="recalledImageId !== null" id="model-selector" v-model="imageParams.options.model" class="select neutral-border mb-2">
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
            <select :disabled="recalledImageId !== null" v-model="imageParams.options.sampler" class="select neutral-border mb-2">
              <option v-for="sampler in availableSamplers" :value="sampler" :key="sampler.name">{{sampler.name}}</option>
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
              <input :disabled="recalledImageId !== null" v-model="imageParams.options.cfg_scale" class="align-middle w-1/2 md:w-1/4 lg:w-1/12 neutral-border input" type="number" />
            </label>
          </div>
          <div v-if="showAdvancedOptions" class="form-control mt-2">
            <label class="cursor-pointer">
              <span class="ms-2 align-middle">Seed &nbsp;</span>
              <input :disabled="recalledImageId !== null" v-model="imageParams.options.seed" class="align-middle neutral-border input" type="number" />
              <button :disabled="recalledImageId !== null" @click="imageParams.options.seed = -1" class="btn btn-secondary mt-2 lg:mt-0 lg:ml-3">Randomize Seed</button>
            </label>
          </div>
          <div v-if="showAdvancedOptions && imageParams.options.subseed !== -1" class="form-control mt-2">
            <label class="cursor-pointer">
              <span class="ms-2 align-middle">Variation Seed &nbsp;</span>
              <input v-model="imageParams.options.subseed" disabled class="align-middle neutral-border input" type="number" />
            </label>
          </div>
          <div v-if="showAdvancedOptions && imageParams.options.subseed_strength !== null" class="form-control mt-2 mb-2">
            <label class="cursor-pointer">
              <span class="ms-2 align-middle">Variation Strength &nbsp;</span>
              <input v-model="imageParams.options.subseed_strength" disabled class="align-middle neutral-border input" type="number" />
            </label>
          </div>
          <span v-if="showAdvancedOptions && recalledImageId !== null && (imageParams.options.subseed !== -1 || imageParams.options.subseed_strength !== null)" class="text-sm mt-8">Note: Clear the recalled image to remove the above Variation settings.</span>
        </div>
      </div>
    </div>
    <div class="grid grid-cols-12 gap-4 mt-5">
      <div class="generated-image-container col-span-12 md:col-span-9">
        <label class="form-control border border-opacity-50 border-gray-500 cornered">
          <span class="label ms-2">Results</span>
          <img v-if="lastJob && (lastJob.status === 'completed' || lastJob.status === 'in_progress')" id="job-image" :src="getImageForJob" alt="Generated Image" class="m-3 pl-2 pr-8 w-full" />
        </label>
      </div>
      <div class="generated-image-metadata-container col-span-12 md:col-span-3 pt-0 m-3 md:pt-10">
        <div class="form-control border border-opacity-50 border-gray-500 cornered">
          <p class="label ms-2 ml-auto mr-auto">Post-processing</p>
          <div class="m-3">
            <button :disabled="!lastJob || lastJob.status !== 'completed'" @click="saveLastJobImage" class="btn btn-success w-full relative"><oh-vue-icon animation="float" class="size-6" name="fa-download"/>&nbsp;Download Image</button>
            <button :disabled="!lastJob || lastJob.status !== 'completed'" @click="copyImageLink" class="btn btn-info w-full mt-2 relative"><oh-vue-icon class="size-7" animation="wrench" name="hi-clipboard-copy"/>&nbsp;Copy Image Link</button>
            <button v-if="!isDeletePending" :disabled="!lastJob || lastJob.status !== 'completed'" @click="onDeleteClick" class="btn btn-error w-full mt-2 relative"><oh-vue-icon class="size-7" name="md-deleteforever"/>&nbsp; Delete Image</button>
            <button v-else :disabled="!lastJob || lastJob.status !== 'completed'" @click="onDeleteClick" class="btn btn-error w-full mt-2 relative"><oh-vue-icon class="size-7" name="md-deleteforever"/><strong>&nbsp;Click To Confirm</strong></button>
<!--            <button v-if="!isImg2Img" :disabled="!lastJob || lastJob.status !== 'completed'" @click="recallLastJob" class="btn btn-primary w-full mt-2 relative"><oh-vue-icon class="size-6" animation="spin" name="md-replaycirclefilled"/>&nbsp; Recall Parameters</button>-->
            <button v-if="!img2imgParams.inpainting" :disabled="!lastJob || lastJob.status !== 'completed'" @click="onVariationClick(0.3)" class="btn btn-accent w-full mt-2 relative"><oh-vue-icon class="size-6" animation="pulse" name="gi-perspective-dice-six-faces-random"/>&nbsp; Variation (Subtle)</button>
            <button v-if="!img2imgParams.inpainting" :disabled="!lastJob || lastJob.status !== 'completed'" @click="onVariationClick(0.7)" class="btn btn-accent w-full mt-2 relative"><oh-vue-icon class="size-6" animation="pulse" name="gi-perspective-dice-six-faces-random"/>&nbsp; Variation (Strong)</button>
            <button v-if="!isImg2Img" :disabled="!lastJob || lastJob.status !== 'completed' || !isEligibleForUpscale" @click="onUpscaleClick" class="btn btn-secondary w-full mt-2 relative"><oh-vue-icon class="size-6" animation="pulse" name="fa-angle-double-up"/>&nbsp;Recall & Upscale 2x</button>
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

input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type=number] {
  -moz-appearance:textfield;
  appearance: textfield;
}
</style>