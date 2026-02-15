import { fetch } from '@tauri-apps/plugin-http';


export async function getPatreonCampaigns(accessToken) {
    const url = 'https://www.patreon.com/api/oauth2/v2/campaigns?fields[campaign]=created_at,creation_name,discord_server_id,image_small_url,image_url,is_charged_immediately,is_monthly,is_nsfw,main_video_embed,main_video_url,one_liner,one_liner,patron_count,pay_per_name,pledge_url,published_at,summary,thanks_embed,thanks_msg,thanks_video_url,has_rss,has_sent_rss_notify,rss_feed_title,rss_artwork_url,patron_count,discord_server_id,google_analytics_id';

    console.log('Fetching Patreon campaigns with access token:', accessToken);

    const response = await fetch(url, {
        headers: {
            'Authorization': 'Bearer ' + accessToken,
        }
    });
    const data = await response.json();
    return data.data;
}


export async function getActivePatreonMembersByLevel(accessToken, campaignId, nextUrl = null) {
    const url = nextUrl || `https://www.patreon.com/api/oauth2/v2/campaigns/${campaignId}/members?include=currently_entitled_tiers&fields[member]=full_name,is_follower,last_charge_date,last_charge_status,lifetime_support_cents,currently_entitled_amount_cents,patron_status&fields[tier]=amount_cents,patron_count,title`;

    const response = await fetch(url, {
        headers: {
            'Authorization': 'Bearer ' + accessToken,
        }
    });
    const data = await response.json();

    const results = data.data.filter(member => member.relationships.currently_entitled_tiers.data.length > 0)
        // Filter out FREE members
        .filter(member => member.attributes.patron_status !== 'free')
        // Filter out members with no currently entitled tiers
        .filter(member => member.relationships.currently_entitled_tiers && member.relationships.currently_entitled_tiers.data.length > 0)
        // Filter out members with no full name
        .filter(member => member.attributes.full_name)
        .map(member => {
        if(member.relationships.currently_entitled_tiers.data.length > 1) {
            // Get the highest tier by amount
            member.relationships.currently_entitled_tiers.data.sort((a, b) => {
                const tierA = data.included.find(tier => tier.id === a.id);
                const tierB = data.included.find(tier => tier.id === b.id);
                return (tierB?.attributes?.amount_cents || 0) - (tierA?.attributes?.amount_cents || 0);
            });
            member.relationships.currently_entitled_tiers.data = [member.relationships.currently_entitled_tiers.data[0]];
        }
        return {
            // id: member.id,
            fullName: member.attributes.full_name,
            currentTierId: member.relationships.currently_entitled_tiers.data[0]?.id,
            lastChargeDate: member.attributes.last_charge_date,
            lastChargeStatus: member.attributes.last_charge_status,
            lifetimeSupportCents: member.attributes.lifetime_support_cents,
            currentlyEntitledAmountCents: member.attributes.currently_entitled_amount_cents,
            patronStatus: member.attributes.patron_status,
            tier: data.included.find(tier => tier.id === member.relationships.currently_entitled_tiers.data[0]?.id) || null,
        };
    }).filter(member => member.tier?.attributes?.title !== 'Free');


    if( data.links && data.links.next ) {
        const nextUrl = data.links.next;
        console.log('Fetching next page of Patreon members:', nextUrl);
        const nextMembers = await getActivePatreonMembersByLevel(accessToken, campaignId, nextUrl);
        results.push(...nextMembers);
    }

    console.log('Fetched active Patreon members:', results.length);

    return results;
}
