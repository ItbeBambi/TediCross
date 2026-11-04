
import { Client, TextChannel } from "discord.js";

/**
 * Fetches the Discord channel mapped to a Telegram topic.
 * Prevents topic-only bridges from falling back to the default channel.
 */
export const fetchDiscordChannel = (
    dcBot: Client,
    bridge: any,
    threadID?: number
) => {
    let channelId = bridge.discord.channelId;

    if (bridge.topicOnly) {
        if (threadID === undefined || threadID === null) {
            return Promise.reject(
                new Error(`Missing Telegram topic ID for bridge ${bridge.name}`)
            ) as Promise<TextChannel>;
        }

        const mapping = bridge.topicBridges?.find(
            (topic: any) => Number(topic.telegram) === Number(threadID)
        );

        if (!mapping) {
            return Promise.reject(
                new Error(
                    `No Discord channel mapping for Telegram topic ${threadID} in bridge ${bridge.name}`
                )
            ) as Promise<TextChannel>;
        }

        channelId = mapping.discord;
    } else if (threadID !== undefined && threadID !== null) {
        const mapping = bridge.topicBridges?.find(
            (topic: any) => Number(topic.telegram) === Number(threadID)
        );

        if (mapping) {
            channelId = mapping.discord;
        }
    }

    return dcBot.channels.fetch(channelId).catch((err: Error) => {
        console.error(
            `Could not find Discord channel ${channelId} in bridge ${bridge.name}: ${err.message}`
        );
        throw err;
    }) as Promise<TextChannel>;
};
