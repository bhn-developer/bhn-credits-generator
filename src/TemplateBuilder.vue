<template>
    <div>
        <textarea v-model="state.template"></textarea>
        <div class="group">
            <button type="button" class="btn" @click="resetTemplate()">Reset Template</button>
            <span style="flex:1;"></span>
            <button type="button" class="btn-primary" @click="updateContent()">Send to Generator</button>
        </div>
    </div>
</template>

<script setup>
import { reactive, onMounted, ref, computed, defineProps, defineEmits, watch } from "vue";
import DefaultTemplate from './assets/default_template.txt?raw';

const props = defineProps({
    lists: {
        type: Object,
        default: () => ({})
    }
});

const state = reactive({
    template: '',
});

const emit = defineEmits(['updateContent']);

onMounted(() => {
    state.template = localStorage.getItem('template_content') || DefaultTemplate;
});

watch(() => state.template, (newTemplate) => {
    localStorage.setItem('template_content', newTemplate);
});


function resetTemplate() {
    state.template = DefaultTemplate;
}

function updateContent() {

    // Replace the [list] placeholder with the actual content from the lists prop

    const output = [];
    state.template.split('\n').forEach((line, index) => {
        if(line.trim() === '') {
            // Skip empty lines
            output.push([{}, '']);
            return;
        }
        if (line.match(/\[[\w\s]+\]/)) {
            // If the line contains a placeholder, replace it with the corresponding list
            const placeholder = line.match(/\[([\w\s]+)\]/)[1];
            if (props.lists[placeholder]) {
                for (const member of props.lists[placeholder]) {
                    output.push([JSON.parse(line.split(';')[0]), line.split(';')[1].replace(`[${placeholder}]`, member)]);
                }
            }
            // state.template = state.template.replace(line, props.lists);
        } else {
            output.push([JSON.parse(line.split(';')[0]), line.split(';')[1]]);
        }
    });

    emit('updateContent', output);

}



</script>

<style scoped>
textarea {
    width: 100%;
    height: 400px;
    margin-bottom: 10px;
    background-color:lightcyan;
    border:solid 1px #ccc;
}
</style>