/**
 * AskChannel Telegram bot — inline channel-picker dropdown, built on
 * @askchannelai/sdk + @askchannelai/telegram and grammY.
 *
 * Commands & flow:
 *   • /askchannel @handle <question>  → answer directly
 *   • /askchannel                     → reply with a "🔍 Search channels" button
 *   • @yourbot <name>                 → inline dropdown of indexed channels
 *   • pick a channel → reply to the prompt with your question → answer
 *
 * Stateless: the picked channel's ref rides in the prompt text (an `ask=` link)
 * and is recovered from the user's reply. The AskChannel-specific glue — search
 * dropdown, reply recovery, answer/error rendering — all comes from
 * @askchannelai/telegram; the rest is plain grammY. Run with `npm run dev`.
 */
import { Bot, Context, InlineKeyboard } from "grammy";
import { createAskChannelClient } from "@askchannelai/sdk";
import {
  ASKCHANNEL_USAGE,
  buildInlineResults,
  channelRefFromPickReply,
  escapeHtml,
  qaErrorMessage,
} from "@askchannelai/telegram";

const BOT_TOKEN = requireEnv("TELEGRAM_BOT_TOKEN");
const ac = createAskChannelClient({ token: requireEnv("ASKCHANNEL_TOKEN") });
const bot = new Bot(BOT_TOKEN);

const searchButton = () =>
  new InlineKeyboard().switchInlineCurrent("🔍 Search channels", "");

/** /askchannel — direct answer, or the search button when no handle is given. */
bot.command("askchannel", async (ctx) => {
  const text = (ctx.match ?? "").trim();
  if (!text) {
    await ctx.reply(ASKCHANNEL_USAGE, {
      parse_mode: "HTML",
      reply_markup: searchButton(),
    });
    return;
  }
  const [first, ...rest] = text.split(/\s+/);
  const channel = first!.replace(/^@+/, "");
  const question = rest.join(" ").trim() || "What's your overall take right now?";
  await answer(ctx, channel, question);
});

/** Inline mode: `@yourbot <name>` → searchable dropdown of indexed channels.
 *  `buildInlineResults` returns raw Bot API article objects grammY accepts. */
bot.on("inline_query", async (ctx) => {
  const channels = await ac.searchChannels(ctx.inlineQuery.query);
  await ctx.answerInlineQuery(buildInlineResults(channels), {
    cache_time: 5,
    is_personal: true,
  });
});

/** A reply to one of our pick-prompts = the question for that channel. */
bot.on("message:text", async (ctx) => {
  const reply = ctx.message.reply_to_message;
  if (reply) {
    const ref = channelRefFromPickReply(
      { via_bot: reply.via_bot, entities: reply.entities },
      ctx.me.username,
    );
    if (ref) {
      await answer(ctx, ref, ctx.message.text.trim());
      return;
    }
  }
  // Not a channel reply — point the user at the picker.
  if (ctx.chat.type === "private") {
    await ctx.reply(ASKCHANNEL_USAGE, {
      parse_mode: "HTML",
      reply_markup: searchButton(),
    });
  }
});

/** Send a placeholder, ask AskChannel, edit the placeholder with the answer. */
async function answer(ctx: Context, channel: string, question: string): Promise<void> {
  const placeholder = await ctx.reply(`🎙️ Asking <b>${escapeHtml(channel)}</b>…`, {
    parse_mode: "HTML",
  });
  try {
    const res = await ac.ask({ channel, question, platform: "telegram" });
    await ctx.api.editMessageText(
      ctx.chat!.id,
      placeholder.message_id,
      res.rendered as string, // telegram render is always an HTML string
      { parse_mode: "HTML", link_preview_options: { is_disabled: true } },
    );
  } catch (e) {
    await ctx.api.editMessageText(
      ctx.chat!.id,
      placeholder.message_id,
      qaErrorMessage(channel, e),
      { parse_mode: "HTML" },
    );
  }
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

await bot.api.setMyCommands([
  { command: "askchannel", description: "Ask a creator's channel" },
]);

// Long-polling. Inline mode must be enabled in @BotFather (/setinline), and we
// must opt into inline_query updates explicitly (grammY only requests the
// update types you handle by default, but we list them to be safe).
console.log("Bot running. Press Ctrl-C to stop.");
await bot.start({ allowed_updates: ["message", "inline_query"] });
