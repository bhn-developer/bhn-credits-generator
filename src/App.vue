<template>
  <div>
    <div class="steps">
      <div @click="step = 'patreon'" :class="{ current: step === 'patreon' }">Step 1</div>
      <div @click="step === 'generator' ? step = 'template' : ''" :class="{ current: step === 'template' }">Step 2</div>
      <div :class="{ current: step === 'generator' }">Step 3</div>
    </div>

    <Patreon v-if="step === 'patreon'" @updateList="updateList($event)" />
    <TemplateBuilder v-if="step === 'template'" :lists="lists" @updateContent="updateContent($event)"/>
    <Generator v-if="step === 'generator'" :content="content" />
  </div>
</template>

<script setup>
import { ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import Generator from "./Generator.vue";
import Patreon from "./Patreon.vue";
import TemplateBuilder from "./assets/TemplateBuilder.vue";

const lists = ref({});
const content = ref([]);

const step = ref('patreon');

function updateList(newLists) {
    lists.value = newLists;
    step.value = 'template';
}

function updateContent(newContent) {
    content.value = newContent;
    step.value = 'generator';
}



</script>

<style>
.btn-primary {
    background-color: #007bff;
    color: white;
    border: none;
    padding: 10px 20px;
    cursor: pointer;
}
</style>

<style scoped>
.steps {
    max-width:600px;
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;

    &>* {
        flex: 1;
        text-align: center;
        padding: 10px;
        background-color: #f0f0f0;

        &.current {
            background-color: #d0d0d0;
        }
    }
}
</style>