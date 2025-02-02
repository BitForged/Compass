<script setup>
import {computed, onMounted, ref} from "vue";
import {addCategory, deleteCategory, editCategory, getMyCategories} from "@/services/NavigatorService";
import {useAlertStore} from "@/stores/alerts";
import ImageCategoryEntry from "@/components/settings/categories/ImageCategoryEntry.vue";

const categories = ref([])
const alerts = useAlertStore()

onMounted(() => {
  // Populate categories array from API
  getMyCategories().then(c => {
    categories.value = c.data;
    console.debug("Retrieved user's categories from Navigator: ", c.data);
  }).catch(e => {
    console.error("Failed to retrieve user's categories from Navigator", e);
    alerts.addAlert(
      "Failed to retrieve user's categories from Navigator, please try again later!",
      "error"
    )
  })
})

const onCategoryUpdate = async (args) => {
  const {id, name} = args;
  try {
    await editCategory(id, name)
  } catch(e) {
    alerts.addAlert(
      "Failed to update category, please try again later!",
      "error")
    console.error("Failed to update category", e)
    return;
  }
  alerts.addAlert(
    "Updated category successfully!",
    "success")
  console.log("Updated category successfully")
  // "Patch" the local copy of the category
  const category = categories.value.find(c => c.id === id)
  category.name = name
}

const onCategoryDelete = async (id) => {
  const isFakeCategory = categories.value.some(c => c.id === id && c.synced === false)
  console.log("Deleting category", id)
  if(!isFakeCategory) {
    try {
      await deleteCategory(id);
    } catch(e) {
      alerts.addAlert(
          "Failed to delete category, please try again later!",
          "error")
      console.error("Failed to delete category", e)
      return;
    }
  }

  // Remove local copy of the category
  categories.value = categories.value.filter(c => c.id !== id)
  if(!isFakeCategory) {
    alerts.addAlert(
        "Deleted category successfully!",
        "success")
    console.log("Deleted category successfully")
  }
}

const onCategoryCreated = async (args) => {
  const {id, name, isNew} = args;
  if(!isNew) {
    // This shouldn't happen, throw an error if it does
    console.error("Category created but not added to local categories array")
    return;
  }
  try {
    let response = await addCategory(name)
    if(response.data.id) {
      let category = categories.value.find(c => c.id === id)
      category.id = response.data.id
      category.name = name
      delete category.synced
      alerts.addAlert(
        "Added category successfully!",
        "success")
    } else {
      console.error("Category creation failed, no ID returned from Navigator")
      alerts.addAlert(
        "Failed to add category, please try again later!",
        "error")
    }
  } catch(e) {

  }
}

const generateNewFakeCategory = () => {
  let id = Math.ceil(Math.random() * 1000)
  // Ensure the fake ID does not conflict with an ID we already have, if it does
  //  keep re-generating the ID until there is not a conflict.
  while(categories.value.some(c => c.id === id)) {
    id = Math.ceil(Math.random() * 1000)
  }
  const name = `New Category`
  categories.value.push({id, name, synced: false})
}

const isFakeCategoryPresent = computed(() => {
  return categories.value.some(c => c.synced === false)
})

</script>

<template>
  <div class="explanation">
    <h1>Image Categories</h1>
    <p>
      This section will allow you to configure and setup categories to place/save images under.
    You can either choose to save an image to a specific category when generating the image on the <code>Generate</code> page,
    or you can change an image's category at any time from the <code>Gallery</code> page.
    </p>
  </div>
  <div class="categories-container">
    <div class="w-full header pt-1 pb-1">
      <button :disabled="isFakeCategoryPresent" class="btn btn-success" @click="generateNewFakeCategory">New Category</button>
    </div>
    <br/>
    <div class="categories-list grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      <div v-for="category in categories" :key="category.id">
        <ImageCategoryEntry @updated="onCategoryUpdate" @deleted="onCategoryDelete" @created="onCategoryCreated" class="col-span-6" :category="category"/>
      </div>
    </div>
  </div>
</template>

<style scoped>
.explanation > h1 {
  font-size: 1.5rem;
  margin-bottom: 10px;
  margin-top: 0;
  font-weight: 500;
  color: #fff;
  text-align: center;
  width: 100%;
}

.explanation > p {
  color: #fff;
  width: 100%;
  margin-bottom: 10px;
  margin-top: 0;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  text-align: justify;
  text-justify: inter-word;
  text-align-last: center;
}

.explanation code {
  background-color: #484545;
  font-weight: bolder;
}

.header {
  display: flex;
  justify-content: flex-end;
}
</style>