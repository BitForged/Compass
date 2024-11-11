<script setup>
import {computed} from "vue";

const props = defineProps({
  width: {
    type: Number,
    required: true,
  },
  height: {
    type: Number,
    required: true,
  },
});

const previewBoxStyle = computed(() => {
  const maxWidth = 200; // Max width for the preview box
  const aspectRatio = props.width / props.height;
  const width = Math.min(maxWidth, maxWidth * aspectRatio);
  const height = width / aspectRatio;
  return {
    width: `${width}px`,
    height: `${height}px`,
    border: "1px solid #000",
    position: "relative",
    backgroundColor: "#f0f0f0",
    borderRadius: "8px",
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px",
  };
});
</script>

<template>
  <div class="preview-container">
    <div :style="previewBoxStyle">
      <div class="arrow arrow-width"></div>
      <div class="arrow arrow-height"></div>
    </div>
  </div>
</template>

<style scoped>
.preview-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
}

.arrow {
  position: absolute;
  width: 0;
  height: 0;
  border-style: solid;
}

.arrow-width {
  border-width: 5px 10px 5px 0;
  border-color: transparent red transparent transparent;
  top: 50%;
  right: -15px;
  transform: translateY(-50%);
}

.arrow-height {
  border-width: 10px 5px 0 5px;
  border-color: red transparent transparent transparent;
  left: 50%;
  top: 100%;
  padding-top: 5px;
  transform: translateX(-50%) rotate(180deg);
}
</style>