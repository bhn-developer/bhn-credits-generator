<template>
    <div v-if="state.loading_members">
        <p>Loading members...</p>
    </div>
    <div v-else>
        <input type="text" v-model="state.accessToken" placeholder="Patreon Access Token">
        <button type="button" @click="getCampaigns()">Get Campaigns</button>
        <br>
        <br>
        <select name="campaigns" id="campaigns" v-model="state.selectedCampaignId">
            <option v-for="campaign in state.campaigns" :key="campaign.id" :value="campaign.id">
                {{ campaign.attributes.creation_name }}
            </option>
        </select>
        <br>
        <br>
        <button type="button" v-if="state.selectedCampaignId" @click="getActiveMembers()">Get Active Members</button>
        <br>
        <br>
        <button type="button" class="btn-primary" @click="updateList()" v-if="state.members_by_level.length > 0">Next Step</button>
        <br>
        <br>
        <div v-if="state.members_by_level.length > 0">
            <h3>Active Members [{{ state.members_by_level.reduce((acc, tierData) => acc + tierData.members.length, 0) }}]</h3>
            <details>
                <summary>Show/Hide Members</summary>
                <ul>
                    <li v-for="(tierData, index) in state.members_by_level" :key="index">
                        <strong>{{ tierData.tier?.attributes?.title || 'No Tier' }}</strong>
                        <ul>
                            <li v-for="member in tierData.members" :key="member.id">
                                {{ member.fullName }}
                            </li>
                        </ul>
                    </li>
                </ul>
            </details>
        </div>
    </div>
    

</template>

<script setup>
import { reactive, onMounted, ref, computed, watch } from "vue";
import { getPatreonCampaigns, getActivePatreonMembersByLevel } from "./patreon_api.js";

const emit = defineEmits(['updateList']);

const state = reactive({
    campaigns: [],
    selectedCampaignId: null,
    members_by_level: {},
    loading_members: false,
    // members: []

    accessToken: localStorage.getItem('patreon_access_token') || '',
});

watch(() => state.accessToken, (newToken) => {
    if (newToken) {
        localStorage.setItem('patreon_access_token', newToken);
    } else {
        localStorage.removeItem('patreon_access_token');
    }
}, { immediate: true });

async function getCampaigns(){
    state.campaigns = await getPatreonCampaigns(state.accessToken);
    console.log('Campaigns:', state.campaigns);
    // Automatically select the first campaign if available
    if (state.campaigns.length > 0) {
        state.selectedCampaignId = state.campaigns[0].id;
    } else {
        console.error('No campaigns found');
    }
}

async function getActiveMembers() {
    if (!state.selectedCampaignId) {
        console.error('No campaign selected');
        return;
    }
    if (state.loading_members) return;
    state.loading_members = true;

    state.members_by_level = {}; // Reset members by level
    
    try {
        const members = await getActivePatreonMembersByLevel(state.accessToken, state.selectedCampaignId);

        let member_data = members.reduce((acc, member) => {
            const tierId = member.currentTierId || 'no_tier';
            if (!acc[tierId]) {
                acc[tierId] = {
                    tier: member.tier,
                    members: []
                };
            }
            acc[tierId].members.push(member);
            return acc;
        }, {});
        // Convert the object to an array and sort by tier amount
        member_data = Object.values(member_data).sort((a, b) => {
            return (b.tier?.attributes?.amount_cents || 0) - (a.tier?.attributes?.amount_cents || 0);
        });
        console.log('Member Data:', member_data);
        state.members_by_level = member_data;

        console.log('Active Members by Level:', state.members_by_level);
    } catch (error) {
        console.error('Error fetching active members:', error);
    } finally {
        state.loading_members = false;
    }
}

async function updateList() {
    emit('updateList', Object.fromEntries(state.members_by_level.map(tierData => ([
        tierData.tier?.attributes?.title || 'No Tier',
        tierData.members.map(member => member.fullName)
    ]))));
}


</script>