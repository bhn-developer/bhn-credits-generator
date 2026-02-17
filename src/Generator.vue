<template>
    <div class="generator" :class="{ showFullScroll: state.show_full_scroll }">
        <h1>Generator</h1>

        <div v-if="!state.isGenerating">
            <div>
                <button type="button" @click="setResolution(3840, 2160)">4K</button>
                <button type="button" @click="setResolution(1920, 1080)">1080p</button>
                <button type="button" @click="setResolution(1280, 720)">720p</button>
                <button type="button" @click="setResolution(640, 360)">360p</button>
                Width
                <input type="text" v-model.number="state.output_video_width">
                Height
                <input type="text" v-model.number="state.output_video_height">
            </div>
            <!-- <input type="text" v-model.number="state.output_video_fps"> -->
             <div>
                Speed
                 <input type="text" v-model.number="state.scroll_speed">
                Time (seconds)
                 <input type="text" v-model.number="state.scroll_time">

             </div>
            <label>
                <input type="checkbox" v-model="state.include_scrollin_and_out">
                Include scroll in/out
            </label>
            <br>
            <p>Scroll length {{ ((contentLines.at(-1)?.y || 0) - 360 + (state.include_scrollin_and_out ? 360 * 2 : 0)).toFixed(2) }}</p>

            <p>Video Time {{ (((contentLines.at(-1)?.y || 0) - 360 + (state.include_scrollin_and_out ? 360 * 2 : 0)) / 60 / state.scroll_speed).toFixed(2) }} seconds</p>

            <select v-model="state.selectedMimeType">
                <option v-for="mimeType in state.available_mime_types" :key="mimeType" :value="mimeType">
                    {{ mimeType }}
                </option>
            </select>
            <br>
            <br>
             
            <button type="button" @click="demo()" v-if="!state.isRunningDemo">Demo Scroll</button>
            <button type="button" @click="stopDemo()" v-else>Stop Demo</button>
            <button type="button" @click="generate()" class="btn-primary">Generate</button>
        </div>
        <div v-if="state.isGenerating">
            <p>Generating video... Please wait.</p>
            <button @click="stopGeneration()">Stop</button>
        </div>

        <div v-else>
            <label><input type="checkbox" v-model="state.show_full_scroll"> Show full scroll</label>
        </div>

        <div class="preview-window">
            <svg :viewBox="`0 0 640 ${!state.isGenerating && state.show_full_scroll ? state.max_scroll_position + (state.include_scrollin_and_out ? 640 * state.output_video_height / state.output_video_width * 2 : 0) : 640 * state.output_video_height / state.output_video_width}`" xmlns="http://www.w3.org/2000/svg" ref="svg">
                <rect :width="state.output_video_width" :height="state.max_scroll_position + (state.include_scrollin_and_out ? 640 * state.output_video_height / state.output_video_width * 2 : 0)" fill="black"/>
                <g ref="textGroup">                    
                    <text 
                        v-for="(item, index) in contentLines" 
                        :key="index"
                        :y="item.y - state.scrollPosition + (state.include_scrollin_and_out ? 640 * state.output_video_height / state.output_video_width : 0)"
                        :x="item.x"
                        fill="white"
                        font-family="system-ui"
                        :font-weight="item.fontWeight || 'normal'"
                        text-anchor="middle"
                        dominant-baseline="middle"
                        :font-size="item.fontSize"
                    >{{ item.text }}</text>
                </g>
            </svg>
        </div>

        <canvas ref="canvas" :width="state.output_video_width" :height="state.output_video_height"></canvas>

    </div>
</template>

<script setup>
import { reactive, onMounted, ref, computed, watch } from "vue";

const state = reactive({
    scrollerContent: '',
    isGenerating: false,
    isRunningDemo: false,
    cancel_generation: false,
    scrollPosition: 0,
    max_scroll_position: 0,
    show_full_scroll: false,

    scroll_speed: 1, // pixels per frame
    scroll_time: null, // seconds (overrides scroll_speed if set)
    include_scrollin_and_out: true,
    output_video_width: 640,
    output_video_height: 360,
    output_video_fps: 60,

    selectedMimeType: null,

    available_mime_types: []
});

onMounted(() => {
    // Find supported mime type
    const mimeTypes = [
        'video/mp4;codecs=h264',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
    ];
    
    for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
            if(!state.available_mime_types.includes(mimeType)) {
                state.available_mime_types.push(mimeType);
            }
            if (!state.selectedMimeType) {
                state.selectedMimeType = mimeType;
                console.log('Using MIME type:', state.selectedMimeType);
            }
        }
    }
});

const props = defineProps({
    content: {
        type: Array,
        default: () => []
    }
});

watch(() => state.scroll_time, (newTime) => {
    if (newTime) {
        const totalScrollLength = (contentLines.value.at(-1)?.y || 0) - 360 + (state.include_scrollin_and_out ? 360 * 2 : 0);
        state.scroll_speed = totalScrollLength / (newTime * state.output_video_fps);
    }
});
watch(() => state.include_scrollin_and_out, () => {
    if (state.scroll_time) {
        const totalScrollLength = (contentLines.value.at(-1)?.y || 0) - 360 + (state.include_scrollin_and_out ? 360 * 2 : 0);
        state.scroll_speed = totalScrollLength / (state.scroll_time * state.output_video_fps);
    }
});

const contentLines = computed(() => {
    let y = 0;
    return props.content.map((item, index) => {
        const fontSize = item[0]?.['font-size'] || 16;
        const text = item[1] || '\u00A0';
        y += fontSize * 1.4; // Approximate line height
        if(y > state.max_scroll_position) {
            state.max_scroll_position = y;
        }
        return {
            text,
            y,
            fontSize,
            fontWeight: item[0]?.['font-weight'] || 'normal',
            x: '50%', // Centered horizontally
            width: state.output_video_width - 100 // Leave some padding
        };
    });
});

const canvas = ref(null);
const svg = ref(null);
const textGroup = ref(null);
let mediaRecorder = null;
let recordedChunks = [];


function setResolution(width, height){
    state.output_video_width = width;
    state.output_video_height = height;
}

async function stopGeneration(){
    state.cancel_generation = true;
}

async function generate(){
    if (state.isGenerating) return;
    
    console.log('Generating content...');
    state.isGenerating = true;
    state.cancel_generation = false;
    state.scrollPosition = 0;
    recordedChunks = [];
    
    // Wait for DOM to update
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const canvasElement = canvas.value;
    const stream = canvasElement.captureStream(state.output_video_fps); // 60 FPS
    
    
    if (!state.selectedMimeType) {
        console.error('No supported MIME type found');
        state.isGenerating = false;
        return;
    }
    
    mediaRecorder = new MediaRecorder(stream, {
        mimeType: state.selectedMimeType,
        videoBitsPerSecond: 2500000
    });
    
    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };
    
    mediaRecorder.onstop = () => {
        if(state.cancel_generation) {
            console.log('Generation was cancelled, no video will be saved.');
            return;
        }

        state.scrollPosition = 0;

        const blob = new Blob(recordedChunks, { type: state.selectedMimeType });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = `credits-${Date.now()}.${state.selectedMimeType.includes('webm') ? 'webm' : 'mp4'}`;
        a.click();
        
        URL.revokeObjectURL(url);
        console.log('Video download started!');
    };
    
    mediaRecorder.start();
    
    const lineHeight = 20;
    const maxScroll = (contentLines.value.at(-1).y) - 360 + (state.include_scrollin_and_out ? 360 * 2 : 0);
    const scrollStep = 1; // pixels per frame (slower = smoother)
    
    const scrollAndRecord = () => {
            console.log(`Scroll position: ${state.scrollPosition.toFixed(2)} / ${maxScroll.toFixed(2)}`);
        if (state.cancel_generation) {
            mediaRecorder.stop();
            state.isGenerating = false;
            state.scrollPosition = 0;
            console.log('Generation cancelled!');
            return;
        } else if (state.scrollPosition <= maxScroll) {
            state.scrollPosition += state.scroll_speed; // Scale scroll speed with resolution
            renderSvgToCanvas();
            requestAnimationFrame(scrollAndRecord);
        } else {
            // Wait a bit before stopping
            setTimeout(() => {
                mediaRecorder.stop();
                state.isGenerating = false;
                console.log('Recording complete!');
            }, 500);
        }
    };
    
    scrollAndRecord();
}

function renderSvgToCanvas(){
    const svgElement = svg.value;
    const canvasElement = canvas.value;
    const ctx = canvasElement.getContext('2d');
    
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    
    img.onload = () => {
        canvasElement.width = state.output_video_width;
        canvasElement.height = state.output_video_height;
        ctx.clearRect(0, 0, state.output_video_width, state.output_video_height);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
    };
    
    img.onerror = (error) => {
        console.error('Error loading SVG image:', error);
        URL.revokeObjectURL(url);
    };
    
    img.src = url;
}

function demo(){
    state.isRunningDemo = true;
    state.scrollPosition = 0;
    const demoScroll = () => {
        if (!state.isRunningDemo) return;
        if (state.scrollPosition <= (contentLines.value.at(-1).y) - 360 + (state.include_scrollin_and_out ? 360 * 2 : 0)) {
            state.scrollPosition += state.scroll_speed
            requestAnimationFrame(demoScroll);
        } else {
            state.isRunningDemo = false;
        }
    };
    demoScroll();
}

function stopDemo(){
    state.isRunningDemo = false;
    state.scrollPosition = 0;
}

</script>

<style scoped>
svg {
    border: 1px solid #ccc;
    display: block;
}

canvas {
    border: 1px solid black;
    margin-top: 20px;
    display:none;
}

.preview-window {
    width:640px;
    height:360px;
    /* overflow:hidden; */
    display:grid;
    place-items:center;

    &>* {
        max-width:100%;
        max-height:100%;
    }
}

.showFullScroll {
    .preview-window {
        height: auto;
    }
}

</style>