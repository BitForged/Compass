<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const images = ref([]);
const basePath = "/example-images"; // Adjust this to match your actual image storage path
const currentIndex = ref(0);
let interval = null;

const nextSlide = () => {
  currentIndex.value = (currentIndex.value + 1) % images.value.length;
};

const prevSlide = () => {
  currentIndex.value = (currentIndex.value - 1 + images.value.length) % images.value.length;
};

const startAutoplay = () => {
  interval = setInterval(nextSlide, 3000); // Auto-slide every 3 seconds
};

const stopAutoplay = () => {
  clearInterval(interval);
};

onMounted(async () => {
  try {
    const response = await fetch(`${basePath}/image-manifest.json`); // Update with your actual manifest URL
    images.value = await response.json();
    // Shuffle the array
    images.value = images.value.sort(() => Math.random() - 0.5);
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
