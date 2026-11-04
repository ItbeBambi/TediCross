import R from "ramda";
import { MessageMap } from "../MessageMap";
import { sleepOneMinute } from "../sleep";
import { fetchDiscordChannel } from "../fetchDiscordChannel";
import { Context } from "telegraf";
import { deleteMessage, ignoreAlreadyDeletedError } from "./helpers";
import { createFromObjFromUser } from "./From";
import { createComponentsV2Message } from "./componentsV2";
import { MessageEditOptions, EmbedBuilder, MessageFlags, AttachmentBuilder } from "discord.js";
import { Message, User } from "telegraf/types";

interface DiscordMessage {
	embeds?: any[];
	content?: string;
	files?: any[];
	components?: any[];
	flags?: MessageFlags[];
	attachments?: Array<{ id: string }>;
}

function isPayloadTooLarge(error: any): boolean {
	return (
		error?.code === 40005 ||
		error?.status === 413 ||
		/request entity too large|payload too large/i.test(String(error?.message ?? error))
	);
}

export interface TediCrossContext extends Context {
	TediCross: any;
	tediCross: {
		message: Message | any;
		file: {
			type: string;
			id: string;
			name: string;
			link?: string;
			linkError?: boolean;
			size?: number;
		};
		messageId: string;
		prepared: any;
		bridges: any;
		replyTo: any;
		text: any;
		forwardFrom: any;
		from: any;
		hasActualReference: boolean;
		hasMediaGroup?: boolean;
	};
}

/***********
 * Helpers *
 ***********/

/**
 * Makes an endware function be handled by all bridges it applies to. Curried
 *
 * @param func	The message handler to wrap
 * @param ctx	The Telegraf context
 */
const createMessageHandler = R.curry((func, ctx) => {
	// Wait for the Discord bot to become ready
	ctx.TediCross.dcBot.ready.then(() => R.forEach(bridge => func(ctx, bridge))(ctx.tediCross.bridges));
});

/*************************
 * The endware functions *
 *************************/

/**
 * Replies to a message with info about the chat for channels.
 *
 * @param ctx	The Telegraf context
 */
export const channelChatInfo = (ctx: Context, next: () => void) => {
	if ((ctx as any).update?.channel_post) {
		if ((ctx as any).update.channel_post.text?.indexOf("/chatinfo") === 0) {
			ctx.reply(`chatID: ${(ctx as any).update.channel_post.chat.id}`)
				// Wait some time
				.then(sleepOneMinute)
				// Delete the info and the command
				.then(message =>
					Promise.all([
						// Delete the info
						deleteMessage(ctx, message),
						// Delete the command
						ctx.deleteMessage()
					])
				)
				.catch(ignoreAlreadyDeletedError as any);
			return;
		}
	}
	next();
};

/**
 * Replies to a command with info about the chat
 *
 * @param ctx	The Telegraf context
 */
export const chatinfo = (ctx: Context) => {
	// Reply with the info
	ctx.reply(`chatID: ${ctx.message?.chat.id}`)
		// Wait some time
		.then(sleepOneMinute)
		// Delete the info and the command
		.then(message =>
			Promise.all([
				// Delete the info
				deleteMessage(ctx, message),
				// Delete the command
				ctx.deleteMessage()
			])
		)
		.catch(ignoreAlreadyDeletedError as any);
};

/**
 * Replies to a command with info about the thread
 *
 * @param ctx	The Telegraf context
 */
export const threadinfo = (ctx: Context) => {
	// Reply with the info
	if (ctx.message?.message_thread_id) {
