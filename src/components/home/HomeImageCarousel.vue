<script setup>
import {ref, onMounted, onUnmounted, toRaw} from "vue";

const images = ref([]);
const basePath = "/example-images";
const currentIndex = ref(0);
let interval = null;

const nextSlide = () => {
  currentIndex.value = (currentIndex.value + 1) % images.value.length;
};

const prevSlide = () => {
  currentIndex.value = (currentIndex.value - 1 + images.value.length) % images.value.length;
};

const startAutoplay = () => {
  interval = setInterval(nextSlide, 3000);
};

const stopAutoplay = () => {
  clearInterval(interval);
};

onMounted(async () => {
  try {
    const response = await fetch(`${basePath}/image-manifest.json`);
    let manifest = await response.json();
    // Shuffle the array
    manifest = manifest.sort(() => Math.random() - 0.5);
    // Take only the first 5 and put them into the `images` value (the user probably doesn't need to see all of them)
    images.value = manifest.slice(0, 5);
    console.log("Image selection completed: ", toRaw(images.value))
    if (images.value.length) startAutoplay();
  } catch (error) {
    console.error("Failed to load images:", error);
  }
});

onUnmounted(() => {
  stopAutoplay();
});
</script>

<template>
  <div v-if="images.length" class="carousel-container relative mx-auto">
    <div
        class="carousel-track flex transition-transform duration-700 ease-in-out"
        :style="{ transform: `translateX(-${currentIndex * 100}%)` }">
      <div v-for="(image, index) in images" :key="index" class="carousel-item flex-shrink-0">
        <img :src="`${basePath}/${image}`" class="carousel-image rounded-xl" alt="Carousel Image" />
      </div>
    </div>
    <div class="absolute flex justify-between transform -translate-y-1/2 left-5 right-5 top-1/2">
      <button @click="prevSlide" class="btn btn-circle">❮</button>
      <button @click="nextSlide" class="btn btn-circle">❯</button>
    </div>
  </div>
  <p v-else class="text-center text-gray-400">No images available</p>
</template>


<style scoped>
.carousel-container {
  width: 100%;
  max-width: 1250px;
  max-height: 650px;
  height: auto;
  overflow: hidden;
  position: relative;
}

.carousel-track {
  display: flex;
  width: 100%;
  transition: transform 0.7s ease-in-out;
}

.carousel-item {
  width: 100%;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.carousel-image {
  width: 100%;
  height: auto;
  object-fit: contain;
  border-radius: 12px;
}
</style>
