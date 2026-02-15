<template>
    <div>
        <textarea v-model="state.template"></textarea>
        <button type="button" class="btn-primary" @click="updateContent()">Send to Generator</button>
    </div>
</template>

<script setup>
import { reactive, onMounted, ref, computed, defineProps, defineEmits } from "vue";
import DefaultTemplate from './default_template.txt?raw';

const props = defineProps({
    lists: {
        type: Object,
        default: () => ({})
    }
});

const state = reactive({
    template: DefaultTemplate,
});

const emit = defineEmits(['updateContent']);

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
    height: 200px;
    margin-bottom: 10px;
    background-color:antiquewhite;
    border:solid 1px #ccc;
}
</style>