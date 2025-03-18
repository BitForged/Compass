<script setup>
import { OhVueIcon } from "oh-vue-icons";
import {computed, onMounted, ref, shallowRef} from "vue";
import {useRouter} from "vue-router";

const settingsCategories = ref([])

const selectedCategoryId = ref(null)

const settingsTemplate = shallowRef()

const router = useRouter()

onMounted(() => {
  settingsCategories.value.push({
    name: "Predefined Prompts",
    id: "prompts",
    icon: "co-speech",
    template_name: "SettingsPredefinedPrompts",
    synced: false
  })
  settingsCategories.value.push({
    name: "Image Categories",
    id: "image-categories",
    icon: "md-category",
    template_name: "SettingsImageCategories",
    synced: true
  })
  settingsCategories.value.push({
    name: "Image Generation",
    id: "image-generation",
    icon: "md-autofixhigh",
    template_name: "SettingsImageGeneration",
  })
  if(router.currentRoute.value.query.category) {
    console.debug("Setting category from query", router.currentRoute.value.query.category);
    setCategory(router.currentRoute.value.query.category);
  } else {
    // Navigate to the first available setting category
    setCategory(settingsCategories.value[0].id);
  }
})

const setCategory = async (id) => {
  selectedCategoryId.value = id;
  console.debug("Selected category: ", id);
  await router.push({query: {category: id}});
  settingsTemplate.value = (
      await import(`@/components/settings/${settingsCategories.value.find((cat) => cat.id === id).template_name}.vue`)
  ).default
}

const getAlertSubclass = computed(() => {
  const category = settingsCategories.value.find((cat) => cat.id === selectedCategoryId.value)
  // noinspection JSUnresolvedReference
  if(category && category.synced) {
    return 'alert-success'
  }

  return 'alert-info'
})

</script>

<template>
  <div v-if="selectedCategoryId !== null" role="alert" class="alert w-fit ml-auto mr-auto mt-1 mb-5" :class="getAlertSubclass">
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        class="h-6 w-6 shrink-0 stroke-current">
      <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
    <span v-if="getAlertSubclass === 'alert-info'">Heads up! These settings are currently stored in your browser's local storage, and are specific to this device.</span>
    <span v-else>These settings <em>are</em> synced to your account, and will persist across devices.</span>
  </div>

  <div class="grid grid-cols-12 gap-4 md:min-h-screen">
    <!-- Settings categories sidebar -->
    <div class="col-span-12 md:col-span-3 xl:col-span-2 right-divider md:h-full max-h-full">
      <h1 class="text-lg text-center mb-3">Settings Categories</h1>
      <ul class="list-none">
        <li v-for="category in settingsCategories" @click="setCategory(category.id)" class="settings-item py-2 max-sm:text-center" :class="selectedCategoryId === category.id ? 'settings-item-selected' : ''"><oh-vue-icon :name="category.icon"/>&nbsp; {{category.name}}</li>
      </ul>
    </div>
    <div class="col-span-12 md:col-span-9 xl:col-span-10 p-3">
      <component :is="settingsTemplate" v-if="settingsTemplate"/>
      <div class="max-w-full w-full" v-else>
        <h3 class="text-lg text-center">Select a category to get started!</h3>
      </div>
    </div>
  </div>
</template>

<style scoped>
.right-divider {
  border-right: 3px solid #272a2d;
}

@media (max-width: 768px) {
  .right-divider {
    border-right: none;
  }
}

.settings-item {
  cursor: pointer;
  transition: background-color 0.2s;
  border-radius: 8px;
  padding: 0.8rem;
  font-size: 1.0rem;
  color: #fff;
  background-color: #272a2d;
  border: 1px solid #272a2d;
  text-align: center;
  width: 75%;
  margin: 0.5rem auto;
}

.settings-item:hover {
  background-color: #424141;
}

.settings-item-selected {
  background-color: #076cd0 !important;
}
</style>