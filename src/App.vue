<template>
  <div>
    <div class="steps">
      <div @click="step = 'patreon'" :class="{ current: step === 'patreon' }">Step 1</div>
      <div @click="step === 'generator' ? step = 'template' : ''" :class="{ current: step === 'template' }">Step 2</div>
      <div @click="step = 'generator'" :class="{ current: step === 'generator' }">Step 3</div>
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
import TemplateBuilder from "./TemplateBuilder.vue";

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

body {
  font-family:system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

.group {
    display:flex;
    gap:0.25em;
}

fieldset {
  border:none;
  margin:0;
  padding:0;
  display:flex;
  gap:0.25em;
  align-items:center;
  margin-bottom:0.25em;
}

label, .label {
  font-size:0.8em;
  font-weight:600;
}

input[readonly] {
  background-color:antiquewhite;
  border:solid 1px #ccc;
}

hr {
    margin: 1em 0;
    border: none;
    border-top: solid 1px #ccc;
}

.btn, [class*="btn-"] {
    background-color: #dddddd;
    color: black;
    border: none;
    padding: 0.5em 1em;
    cursor: pointer;
    border-radius:0.25em;

    &:hover {
        background-image:linear-gradient(#0004, #0004)
    }
}

.btn-primary {
    background-color: #007bff;
    color: white;
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