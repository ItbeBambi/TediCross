import { Bridge } from "./Bridge";

/**
 * Route Telegram messages to their configured topics.
 * General topic (ID 1) may have no message_thread_id.
 */
export function bridgesForTelegramTopic(bridges: Bridge[], threadId: number | undefined): Bridge[] {
	return bridges.flatMap(bridge => {
		if (threadId === undefined || threadId === null) {
			if (!bridge.topicOnly) return [bridge];

			const general = bridge.topicBridges.find(item => item.telegram === 1);

			return general ? [{ ...bridge, tgThread: 1 } as Bridge] : [];
		}

		const mapping = bridge.topicBridges.find(item => item.telegram === threadId);

		if (mapping) {
			return [{ ...bridge, tgThread: mapping.telegram } as Bridge];
		}

		if (bridge.topicOnly || (bridge.topicBridges.length > 0 && !bridge.topicBridgesAutoCreate)) {
			return [];
		}

		return [bridge];
	});
}
