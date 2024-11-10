<script setup>
import {computed, onMounted, onUnmounted, ref, watch} from "vue";
import { OhVueIcon } from "oh-vue-icons";

const imageParams = ref({
  width: "800",
  height: "600",
  options: {
    option1: false,
    option2: false,
    option3: false,
  },
});

const showTipsModal = ref(false);

const doesSizeRequireUpscale = computed(() => {
  return (imageParams.value.width * imageParams.value.height) > (1024 * 1024);
});

const doesSizeExceedLimit = computed(() => {
  return (imageParams.value.width * imageParams.value.height) > (2160 * 1440);
});

const isImageParamsValid = computed(() => {
  return !doesSizeExceedLimit.value;
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

watch(showTipsModal, (newValue) => {
  toggleBodyScroll(newValue);
});

onMounted(() => {
  toggleBodyScroll(showTipsModal.value);
});

onUnmounted(() => {
  toggleBodyScroll(false);
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

          <textarea class="textarea h-24 textarea-bordered m-3" placeholder="Enter your prompt here! What do you want to see in the image?"></textarea>
          <textarea class="textarea h-24 textarea-bordered m-3" placeholder="Optionally, enter a negative prompt - which describes what you don't want to see in the image."></textarea>
        </label>
      </div>
      <div class="generate-button-container col-span-12 md:col-span-2 pt-0 m-3 md:pt-10">
        <button v-if="isImageParamsValid" class="btn btn-success text-white text-opacity-100 w-full mb-5">Generate</button>
        <button v-else class="btn btn-disabled text-white text-opacity-100 w-full mb-5">Generate</button>
        <button class="btn btn-error btn-disabled text-white text-opacity-100 w-full">Interrupt / Cancel</button>
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
            <label class="cursor-pointer">
              <input class="checkbox checkbox-sm" type="checkbox" />
              <span class="ms-2">Option 1</span>
            </label>
          </div>
          <div class="form-control">
            <label class="cursor-pointer">
              <input type="checkbox" />
              <span class="ms-2">Option 2</span>
            </label>
          </div>
          <div class="form-control">
            <label class="cursor-pointer">
              <input type="checkbox" />
              <span class="ms-2">Option 3</span>
            </label>
          </div>
        </div>
      </label>
    </div>
    <div class="grid grid-cols-12 gap-4 mt-5">
      <div class="generated-image-container col-span-12 md:col-span-10">
        <label class="form-control border border-opacity-50 border-gray-500 cornered">
          <span class="label ms-2">Results</span>
          <img src="https://via.placeholder.com/800x600" alt="Generated Image" class="m-3" />
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

.no-scroll {
  overflow: hidden;
}

</style>