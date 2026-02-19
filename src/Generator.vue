<template>
    <div class="generator" :class="{ showFullScroll: state.show_full_scroll }">
        <div v-if="!state.is_generating">
            <label>Video output resolution</label>
            <div class="group">
                <button type="button" class="btn" @click="setResolution(3840, 2160)">4K</button>
                <button type="button" class="btn" @click="setResolution(1920, 1080)">1080p</button>
                <button type="button" class="btn" @click="setResolution(1280, 720)">720p</button>
                <button type="button" class="btn" @click="setResolution(640, 360)">360p</button>
                <fieldset>
                    <label>Width</label>
                    <input type="text" v-model.number="state.output_video_width">
                </fieldset>
                <fieldset>
                    <label>Height</label>
                    <input type="text" v-model.number="state.output_video_height">
                </fieldset>
            </div>
            <br>
            <div class="group">
                <fieldset>
                    <label>FPS</label>
                    <input type="text" v-model.number="state.output_video_fps">
                </fieldset>
                <fieldset>
                    <label>Speed</label>
                    <input type="text" v-model.number="state.scroll_speed">
                </fieldset>
                <fieldset>
                    <label>Time (seconds)</label>
                    <input type="text" v-model.number="state.scroll_time">
                </fieldset>
            </div>
            <div class="group">
                <fieldset>
                    <label>Scroll length</label>
                    <input type="text" :value="total_scroll_distance.toFixed(2)" readonly>
                </fieldset>
                <fieldset>
                    <label>Video duration</label>
                    <input type="text" :value="(total_scroll_distance / state.output_video_fps / state.scroll_speed).toFixed(2)" readonly>
                </fieldset>
                <fieldset>                
                    <label>
                        <input type="checkbox" v-model="state.include_scrollin_and_out">
                        Include scroll in/out
                    </label>
                </fieldset>
            </div>

            <!-- <select v-model="state.selectedMimeType">
                <option v-for="mimeType in state.available_mime_types" :key="mimeType" :value="mimeType">
                    {{ mimeType }}
                </option>
            </select> -->
            <hr>
             <div class="group">
                 <button type="button" @click="demo()" class="btn" v-if="!state.is_running_demo">Demo Scroll</button>
                 <button type="button" @click="stopDemo()" class="btn" v-else>Stop Demo</button>
                 <span style="flex:1;"></span>
                 <button type="button" @click="generate()" class="btn-primary">Generate</button>
             </div>
        </div>
        <div v-if="state.is_generating" class="group" style="align-items:center;">
            <p>Generating video... {{ state.generation_progress }}%</p>
            <progress :value="state.generation_progress" max="100"></progress>
            <button type="button" class="btn" @click="stopGeneration()">Stop</button>
        </div>

        <div v-else>
            <fieldset>
                <label><input type="checkbox" v-model="state.show_full_scroll"> Show full scroll</label>
            </fieldset>
        </div>

        <div class="preview-window" v-if="!state.is_generating">
            <svg :viewBox="`0 0 640 ${!state.is_generating && state.show_full_scroll ? total_scroll_distance : 360 }`" xmlns="http://www.w3.org/2000/svg" ref="svg">
                <rect :width="state.output_video_width" :height="total_scroll_distance" fill="black"/>
                <g ref="textGroup">                    
                    <text 
                        v-for="(item, index) in contentLines" 
                        :key="index"
                        :y="item.y - state.scroll_position + (state.include_scrollin_and_out ? 360 : 0)"
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
import { Command } from '@tauri-apps/plugin-shell';
import { tempDir } from '@tauri-apps/api/path';
import { mkdir, BaseDirectory, writeFile, remove } from '@tauri-apps/plugin-fs';
import { save } from '@tauri-apps/plugin-dialog';

const state = reactive({
    scrollerContent: '',
    is_generating: false,
    is_running_demo: false,
    cancel_generation: false,
    generation_progress: 0,
    scroll_position: 0,
    max_scroll_position: 0,
    show_full_scroll: false,

    scroll_speed: 1, // pixels per frame
    scroll_time: null, // seconds (overrides scroll_speed if set)
    include_scrollin_and_out: true,
    output_video_width: 640,
    output_video_height: 360,
    output_video_fps: 60,

    // selectedMimeType: null,

    // available_mime_types: []
});

onMounted(async () => {
    // Check ffmpeg is available
    try {
        const result = await Command.create('ffmpeg', ['-version']).execute();
        if (result.code !== 0) throw new Error();
        console.log('ffmpeg found');
    } catch {
        alert('ffmpeg is not installed or not in PATH. Please install it to generate videos.');
    }

    state.output_video_width = parseInt(localStorage.getItem('output_video_width')) || 640;
    state.output_video_height = parseInt(localStorage.getItem('output_video_height')) || 360;
    state.output_video_fps = parseInt(localStorage.getItem('output_video_fps')) || 60;
    state.scroll_speed = parseFloat(localStorage.getItem('scroll_speed')) || 1;
    state.scroll_time = parseFloat(localStorage.getItem('scroll_time')) || null;
    state.include_scrollin_and_out = localStorage.getItem('include_scrollin_and_out') === 'true';

    // Find supported mime type
    // const mimeTypes = [
    //     'video/mp4;codecs=h264',
    //     'video/webm;codecs=vp9',
    //     'video/webm;codecs=vp8',
    //     'video/webm',
    // ];
    
    // for (const mimeType of mimeTypes) {
    //     if (MediaRecorder.isTypeSupported(mimeType)) {
    //         if(!state.available_mime_types.includes(mimeType)) {
    //             state.available_mime_types.push(mimeType);
    //         }
    //         if (!state.selectedMimeType) {
    //             state.selectedMimeType = mimeType;
    //             console.log('Using MIME type:', state.selectedMimeType);
    //         }
    //     }
    // }
});

watch(() => state.output_video_width, (newWidth) => {
    localStorage.setItem('output_video_width', newWidth);
});
watch(() => state.output_video_height, (newHeight) => {
    localStorage.setItem('output_video_height', newHeight);
});
watch(() => state.output_video_fps, (newFps) => {
    localStorage.setItem('output_video_fps', newFps);
});
watch(() => state.scroll_speed, (newSpeed) => {
    localStorage.setItem('scroll_speed', newSpeed);
});
watch(() => state.scroll_time, (newTime) => {
    if (newTime) {
        localStorage.setItem('scroll_time', newTime);
    } else {
        localStorage.removeItem('scroll_time');
    }
});
watch(() => state.include_scrollin_and_out, (newValue) => {
    localStorage.setItem('include_scrollin_and_out', newValue);
});

const props = defineProps({
    content: {
        type: Array,
        default: () => []
    }
});

watch(() => state.scroll_time, (newTime) => {
    if (newTime) {
        state.scroll_speed = total_scroll_distance.value / (newTime * state.output_video_fps);
    }
});
watch(() => state.include_scrollin_and_out, () => {
    if (state.scroll_time) {
        state.scroll_speed = total_scroll_distance.value / (state.scroll_time * state.output_video_fps);
    }
});
watch(() => state.output_video_fps, () => {
    if (state.scroll_time) {
        state.scroll_speed = total_scroll_distance.value / (state.scroll_time * state.output_video_fps);
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

const total_scroll_distance = computed(() => {
    if(contentLines.value.length === 0) return 0;
    const value = (contentLines.value.at(-1)?.y || 0) + (contentLines.value.at(-1)?.fontSize || 0) + (state.include_scrollin_and_out ? 360 * 2 : 0);
    if(isNaN(value)) return 0;
    return value;
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
    if (state.is_generating) return;
    state.is_generating = true;
    state.cancel_generation = false;

    const generation_id = `generation_${Date.now().toString()}`;

    try {
        const canvasEl = canvas.value;
        canvasEl.width = state.output_video_width;
        canvasEl.height = state.output_video_height;
        const ctx = canvasEl.getContext('2d');

        const temp = await tempDir();
        const framesDir = `${temp}/${generation_id}`;
        await mkdir(generation_id, { baseDir: BaseDirectory.Temp });
        console.log('Frames dir:', framesDir);

        const totalFrames = Math.ceil(total_scroll_distance.value / state.scroll_speed);

        // Render each frame to canvas and save as PNG
        for (let i = 0; i < totalFrames; i++) {
            if (state.cancel_generation) break;

            const scrollPos = i * state.scroll_speed - (state.include_scrollin_and_out ? 360 : 0);

            drawFrame(ctx, scrollPos);

            // Convert canvas to PNG blob and write to disk
            const blob = await new Promise(resolve => canvasEl.toBlob(resolve, 'image/png'));
            const arrayBuffer = await blob.arrayBuffer();
            const filename = `${framesDir}/frame_${String(i).padStart(6, '0')}.png`;
            await writeFile(filename, new Uint8Array(arrayBuffer));

            // Update progress
            state.generation_progress = Math.round((i / totalFrames) * 100);
        }

        if (!state.cancel_generation) {
            // Ask user where to save
            let outputPath = await save({
                filters: [{ name: 'Video', extensions: ['mp4'] }]
            });

            // Ensure .mp4 extension
            if (outputPath && !outputPath.endsWith('.mp4')) {
                outputPath += '.mp4';
            }

            if (outputPath) {
                // Run ffmpeg to stitch frames
                const command = Command.create('ffmpeg', [
                    '-framerate', state.output_video_fps.toString(),
                    '-i', `${framesDir}/frame_%06d.png`,
                    '-c:v', 'libx264',
                    '-pix_fmt', 'yuv420p',
                    '-y',
                    outputPath
                ]);

                command.stderr.on('data', (data) => console.log('[ffmpeg]', data));
                const result = await command.execute();
                console.log('ffmpeg exit code:', result.code);

                if (result.code !== 0) {
                    throw new Error(`ffmpeg failed: ${result.stderr}`);
                }

                console.log('Video saved to:', outputPath);
            }
        }
    } catch (error) {
        console.error('Generation error:', error);
        alert(`Failed to generate video: ${error}`);
    } finally {
        state.is_generating = false;
        state.generation_progress = 0;

        // Cleanup temp frames
        await remove(generation_id, { baseDir: BaseDirectory.Temp, recursive: true });
    }
}

function drawFrame(ctx, scrollPos) {
    const w = state.output_video_width;
    const h = state.output_video_height;

    // Background
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, w, h);

    // Scale factor from SVG (designed at 640px wide) to actual output resolution
    const scale = w / 640;

    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    contentLines.value.forEach((item) => {
        const y = (item.y - scrollPos) * scale;
        // Cull off-screen lines
        if (y < -item.fontSize * scale || y > h + item.fontSize * scale) return;

        ctx.font = `${item.fontWeight} ${item.fontSize * scale}px system-ui`;
        ctx.fillText(item.text, w / 2, y);
    });
}

function buildHTMLContent() {
    let html = '<div style="width: 100%; text-align: center; color: white; font-family: system-ui;">';
    
    contentLines.value.forEach((item) => {
        html += `<div style="font-size: ${item.fontSize}px; font-weight: ${item.fontWeight}; margin: ${item.fontSize * 0.4}px 0;">
            ${escapeHtml(item.text)}
        </div>`;
    });
    
    html += '</div>';
    return html;
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function demo(){
    state.is_running_demo = true;
    state.scroll_position = 0;
    const demoScroll = () => {
        if (!state.is_running_demo) return;
        if (state.scroll_position <= (contentLines.value.at(-1).y) - 360 + (state.include_scrollin_and_out ? 360 * 2 : 0)) {
            state.scroll_position += state.scroll_speed
            requestAnimationFrame(demoScroll);
        } else {
            state.is_running_demo = false;
        }
    };
    demoScroll();
}

function stopDemo(){
    state.is_running_demo = false;
    state.scroll_position = 0;
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