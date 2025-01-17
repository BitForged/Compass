<script setup>
import { OhVueIcon } from "oh-vue-icons";
import {onMounted, ref} from "vue";
import SettingsPredefinedPrompts from "@/components/settings/SettingsPredefinedPrompts.vue";
import {useRouter} from "vue-router";

const settingsCategories = ref([])

const selectedCategoryId = ref(null)

const router = useRouter()

onMounted(() => {
  settingsCategories.value.push({
    name: "Predefined Prompts",
    id: "prompts",
    icon: "co-speech",
  })
  if(router.currentRoute.value.query.category) {
    console.debug("Setting category from query", router.currentRoute.value.query.category);
    selectedCategoryId.value = router.currentRoute.value.query.category;
  }
})

const setCategory = (id) => {
  selectedCategoryId.value = id;
  console.debug("Selected category: ", id);
  router.push({query: {category: id}});
}

</script>

<template>
  <div role="alert" class="alert alert-info w-fit ml-auto mr-auto mb-5">
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
    <span>Heads up! These settings are currently stored in your browser's local storage, and will not be synced.</span>
  </div>

  <div class="grid grid-cols-12 gap-4 md:min-h-screen">
    <!-- Settings categories sidebar -->
    <div class="col-span-12 md:col-span-3 xl:col-span-2 right-divider md:h-full max-h-full">
      <h1 class="text-lg text-center mb-3">Settings Categories</h1>
      <ul class="list-none">
        <li v-for="category in settingsCategories" @click="setCategory(category.id)" class="settings-item py-2 max-sm:text-center"><oh-vue-icon :name="category.icon"/>&nbsp; {{category.name}}</li>
      </ul>
    </div>
    <div class="col-span-12 md:col-span-9 xl:col-span-10 p-3">
      <SettingsPredefinedPrompts v-if="selectedCategoryId === 'prompts'"/>
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
  margin: 0.5rem;
  font-size: 1.0rem;
  /*font-weight: 500;*/
  color: #fff;
  background-color: #272a2d;
  border: 1px solid #272a2d;
  text-align: center;
  width: 75%;
  margin-left: auto;
  margin-right: auto;
  /*max-width: 100%;
  max-height: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
  text-decoration: none;*/

}
</style>