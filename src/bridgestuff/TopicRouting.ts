import { Bridge } from "./Bridge";

/** Selects only bridges permitted to relay a Telegram message from the given topic. */
export function bridgesForTelegramTopic(bridges: Bridge[], threadId: number | undefined): Bridge[] {
	return bridges.flatMap(bridge => {
		if (!threadId) return bridge.topicOnly ? [] : [bridge];
		const mapping = bridge.topicBridges.find(item => item.telegram === threadId);
		if (mapping) return [{ ...bridge, tgThread: mapping.telegram } as Bridge];
		if (bridge.topicOnly || (bridge.topicBridges.length > 0 && !bridge.topicBridgesAutoCreate)) return [];
		return [bridge];
	});
}
