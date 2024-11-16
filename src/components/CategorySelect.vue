<script setup>
import {computed, onMounted, ref, watch} from "vue";
import {addCategory, deleteCategory, getMyCategories} from "@/services/NavigatorService";
import {useAlertStore} from "@/stores/alerts";
const categories = ref([]);
const newCategoryName = ref("");
const selectedCategoryId = ref(null);
const isDeletePending = ref(false);
const alertStore = useAlertStore();

const emit = defineEmits(["onCategorySelected", "onCategoriesChanged"]);
const props = defineProps(["allowModify", "showRemoveOption"]);

watch(selectedCategoryId, (newVal) => {
  // Do not emit the event if the category has a negative ID as these are not valid categories
  if(newVal >= 0 || newVal === -100)
    emit("onCategorySelected", newVal);
  else
    emit("onCategorySelected", null);
});

const refreshCategories = () => {
  getMyCategories().then((res) => {
    categories.value = [];
    categories.value.push({name: "Select a category", id: -1});
    selectedCategoryId.value = -1;
    res.data.forEach((category) => {
      categories.value.push(category);
    });
    if(props.allowModify) {
      categories.value.push({name: "Add a new category", id: -50});
    }
    if(props.showRemoveOption) {
      categories.value.push({name: "Remove category", id: -100});
    }
  }).catch((error) => {
    console.error("Failed to get categories", error);
    categories.value.push({name: "Failed to get categories", id: -2});
    selectedCategoryId.value = -2;
  });
};

const isDeleteDisabled = computed(() => {
  return selectedCategoryId.value < 0;
});

const isAddingCategory = computed(() => {
  return selectedCategoryId.value === -50;
});

const onAddCategory = () => {
  if(newCategoryName.value === '') {
    console.error("Cannot add a category with an empty name");
    alertStore.addAlert("Cannot add a category with an empty name", "error");
    return;
  }
  addCategory(newCategoryName.value).then((_) => {
    console.log("Added category successfully");
    alertStore.addAlert("Added category successfully", "success");
    newCategoryName.value = "";
    refreshCategories();
  }).catch((error) => {
    console.error("Failed to add category", error);
    alertStore.addAlert("Failed to add category", "error");
  });
};

const onDeleteCategory = () => {
  if(!isDeletePending.value) {
    isDeletePending.value = true;
    setTimeout(() => {
      isDeletePending.value = false;
    }, 2000);
    return;
  }
  if (selectedCategoryId.value < 0) {
    console.error("Cannot delete a category with a negative ID");
    alertStore.addAlert("Cannot delete a category with a negative ID", "error");
    return;
  }

  deleteCategory(selectedCategoryId.value).then((res) => {
    if(res.status !== 204) {
      console.error("Failed to delete category", res);
      alertStore.addAlert("Failed to delete category", "error");
      return;
    }
    console.log("Deleted category successfully");
    alertStore.addAlert("Deleted category successfully", "success");
    refreshCategories();
  }).catch((error) => {
    console.error("Failed to delete category", error);
    alertStore.addAlert("Failed to delete category", "error");
  });

}

onMounted(() => {
  refreshCategories();
});
</script>

<template>
  <div class="grid grid-cols-1 grid-flow-row grid-rows-auto">
    <div class="col">
      <select v-model="selectedCategoryId" class="mt-2 select select-bordered row">
        <option v-for="category in categories" :value="category.id">{{category.name}}</option>
      </select>
      <button v-if="allowModify && !isDeletePending" @click="onDeleteCategory" :disabled="isDeleteDisabled" class="btn btn-warning mt-1 ms-1 row">Delete?</button>
      <button v-if="allowModify && isDeletePending" @click="onDeleteCategory" :disabled="isDeleteDisabled" class="btn btn-error mt-1 ms-1 row"><strong>Confirm!</strong></button>
      <div class="mt-3" v-if="allowModify && isAddingCategory">
        <input v-model="newCategoryName" class="input input-bordered mt-1 row" type="text" placeholder="New Category Name"/>
        <button @click="onAddCategory" :disabled="newCategoryName === ''" class="btn btn-primary mt-1 ms-1 row">Add</button>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>