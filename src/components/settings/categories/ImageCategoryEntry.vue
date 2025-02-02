<script setup>
import {nextTick, onMounted, ref} from "vue";
import { OhVueIcon } from "oh-vue-icons";

const props = defineProps({
  category: Object
})

const emit = defineEmits(['deleted', 'updated', 'created'])

const isNew = ref(props.category.synced === false)

const isEditing = ref(false)
const editedName = ref(props.category.name)
const nameField = ref(null)

const isDeleting = ref(false)
const deleteProgress = ref(0)
const duration = 2000;

const onDelete = () => {
  if(isDeleting.value) {
    emit('deleted', props.category.id);
  } else {
    isDeleting.value = true;
    startDeleteTimer()
    setTimeout(() => {
      isDeleting.value = false;
    }, 2000);
  }
}

const startDeleteTimer = () => {
  deleteProgress.value = 0;
  const startTime = Date.now();
  const timer = setInterval(() => {
    const elapsed = Date.now() - startTime;
    deleteProgress.value = Math.round(elapsed / 1000 * 100);
    if(elapsed >= duration) {
      clearInterval(timer);
      deleteProgress.value = 100;
    }
  }, 100);
}

const onEditSubmit = (save) => {
  if(!save) {
    isEditing.value = false;
    editedName.value = props.category.name;
    if(isNew.value) {
      // If new/not-saved, just discard the category as they likely do not want it/changed their mind
      emit('deleted', props.category.id);
    }
    return;
  }

  isEditing.value = false;
  if(isNew.value) {
    emit('created', {
      name: editedName.value,
      id: props.category.id,
      isNew
    })
    return;
  }
  emit('updated', {
    id: props.category.id,
    name: editedName.value
  })
}

onMounted(() => {
  if(isNew.value) {
    isEditing.value = true;
  }

  nextTick(() => {
    if(isNew.value) {
      // noinspection JSUnresolvedReference
      nameField.value.focus();
      // noinspection JSUnresolvedReference
      nameField.value.select();
    }
  })
})


</script>

<template>
  <div class="entry size-full align-middle p-2 grid grid-cols-12 gap-1 rounded-xl shadow-md bg-neutral-800 hover:shadow-lg transition-shadow">
    <div v-if="!isEditing" class="flex items-center col-span-8 xl:col-span-10">
      <!--suppress JSUnresolvedReference -->
      <p class="rounded-full px-3 py-1 bg-gray-700 text-white">{{category.name}}</p>
    </div>
    <div v-else class="flex items-center col-span-8 xl:col-span-10">
      <oh-vue-icon v-if="isNew" name="md-fibernew" fill="#ffd700" scale="2" class="mr-2"/>
      <input ref="nameField" v-model="editedName" type="text" class="align-middle input input-primary input-bordered w-full"
             @keyup.enter="onEditSubmit(true)" @keyup.esc="onEditSubmit(false)"/>
    </div>
    <div v-if="!isEditing" class="flex items-center justify-center w-fit gap-1">
      <button class="btn btn-circle btn-primary col-span-2 xl:col-span-1" @click="isEditing = true"><oh-vue-icon name="fa-edit" /></button>
      <button v-if="!isDeleting" class="btn btn-circle btn-error col-span-2 xl:col-span-1" @click="onDelete"><oh-vue-icon name="md-deleteforever"/></button>
      <button v-else class="btn btn-circle btn-error-darker col-span-2 xl:col-span-1" @click="onDelete">
        <oh-vue-icon name="fa-question" animation="pulse"/>
        <!-- Progress Overlay -->
        <!--suppress HtmlUnknownTag -->
        <div class="absolute top-0 left-0 h-full bg-white/50" :style="{ width: `${deleteProgress}%`, transition: 'width 0.5s linear'}"></div>
      </button>
    </div>
    <div v-else class="flex items-center justify-center w-fit gap-1">
      <button class="btn btn-circle btn-success col-span-2 xl:col-span-1" @click="onEditSubmit(true)"><oh-vue-icon name="fa-check"/></button>
      <button v-if="!isNew" class="btn btn-circle btn-warning col-span-2 xl:col-span-1" @click="onEditSubmit(false)"><oh-vue-icon name="fa-times"/></button>
      <button v-else class="btn btn-circle btn-error col-span-2 xl:col-span-1" @click="onEditSubmit(false)"><oh-vue-icon name="fa-times"/></button>
    </div>
  </div>
</template>

<style scoped>
.entry {
  border: 1px solid #424141;
  padding: 0.5rem;
}

button {
  position: relative; /* Enables positioning for the overlay */
  overflow: hidden; /* Ensures progress stays within the button bounds */
}

button span {
  position: relative; /* Keep text above the overlay */
  z-index: 10; /* Ensure it's above the overlay */
}

button > div {
  z-index: 5; /* Place the overlay below text */
}

.btn-error-darker {
  background-color: #ff2e2e;
  color: black;
}
</style>