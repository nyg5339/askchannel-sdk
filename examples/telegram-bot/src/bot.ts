/**
 * AskChannel Telegram bot — inline channel-picker dropdown, built on
 * @askchannel/sdk and grammY.
 *
 * Commands & flow:
 *   • /askchannel @handle <question>  → answer directly
 *   • /askchannel                     → reply with a "🔍 Search channels" button
 *   • @yourbot <name>                 → inline dropdown of indexed channels
 *   • pick a channel → reply to the prompt with your question → answer
 *
 * Stateless: the picked channel's ref is carried in the prompt text and
 * recovered from the user's reply. Run with: `npm run dev`.
 */
import { Bot, Context, InlineKeyboard, InlineQueryResultBuilder } from "grammy";
import { createAskChannelClient, isAskChannelError } from "@askchannel/sdk";
import type { AskChannelError, Channel } from "@askchannel/sdk";

const BOT_TOKEN = requireEnv("TELEGRAM_BOT_TOKEN");
const ac = createAskChannelClient({ token: requireEnv("ASKCHANNEL_TOKEN") });
const bot = new Bot(BOT_TOKEN);

const USAGE = "Usage: <code>/askchannel @handle your question</code>";

/** /askchannel — direct answer, or the search button when no handle is given. */
bot.command("askchannel", async (ctx) => {
  const text = (ctx.match ?? "").trim();
  if (!text) {
    const kb = new InlineKeyboard().switchInlineCurrent("🔍 Search channels", "");
    await ctx.reply(USAGE, { parse_mode: "HTML", reply_markup: kb });
    return;
  }
  const [first, ...rest] = text.split(/\s+/);
  const channel = first!.replace(/^@+/, "");
  const question = rest.join(" ").trim() || "What's your overall take right now?";
  await answer(ctx, channel, question);
});

/** Inline mode: `@yourbot <name>` → searchable dropdown of indexed channels. */
bot.on("inline_query", async (ctx) => {
  const channels = await ac.searchChannels(ctx.inlineQuery.query);
  const results = channels.map((c) =>
    InlineQueryResultBuilder.article(c.id, c.title, {
      description: channelDescription(c),
      ...(c.thumbnail ? { thumbnail_url: c.thumbnail } : {}),
    }).text(pickPrompt(c), {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    }),
  );
  await ctx.answerInlineQuery(results, { cache_time: 5, is_personal: true });
});

/** A reply to one of our pick-prompts = the question for that channel. */
bot.on("message:text", async (ctx) => {
  const reply = ctx.message.reply_to_message;
  if (reply && reply.via_bot?.username === ctx.me.username) {
    const ref = extractRef(reply.text ?? "");
    if (ref) {
      await answer(ctx, ref, ctx.message.text.trim());
      return;
    }
  }
  // Not a channel reply — point the user at the picker.
  if (ctx.chat.type === "private") {
    const kb = new InlineKeyboard().switchInlineCurrent("🔍 Search channels", "");
    await ctx.reply(USAGE, { parse_mode: "HTML", reply_markup: kb });
  }
});

/** Send a placeholder, ask AskChannel, edit the placeholder with the answer. */
async function answer(ctx: Context, channel: string, question: string): Promise<void> {
  const placeholder = await ctx.reply(`🎙️ Asking <b>${esc(channel)}</b>…`, {
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
    const msg = isAskChannelError(e) ? friendlyError(e, channel) : "⚠️ Something went wrong.";
    await ctx.api.editMessageText(ctx.chat!.id, placeholder.message_id, msg, {
      parse_mode: "HTML",
    });
  }
}

function channelDescription(c: Channel): string {
  return [c.handle, c.videoCount ? `${c.videoCount} videos` : ""].filter(Boolean).join(" · ");
}

/** Prompt sent on pick. Carries the channel ref (handle or id) in `(…)` so the
 *  reply handler can recover which channel was chosen. */
function pickPrompt(c: Channel): string {
  const ref = c.handle ?? c.id;
  return (
    `🎙️ <b>${esc(c.title)}</b> (${esc(ref)})\n\n` +
    `💬 <b>Reply to this message</b> with your question.`
  );
}

function extractRef(promptText: string): string | null {
  const m = promptText.match(/\(([@\w.\-]+)\)/);
  return m ? m[1]! : null;
}

function friendlyError(e: AskChannelError, channel: string): string {
  switch (e.code) {
    case "not_found":
      return `I don't have <b>${esc(channel)}</b> indexed yet.`;
    case "quota_exceeded":
      return "Daily question limit reached.";
    case "unauthorized":
      return "The AskChannel token is invalid or not premium.";
    case "rate_limited":
      return "Too many questions right now — try again in a moment.";
    default:
      return `Couldn't get an answer for <b>${esc(channel)}</b> — try again shortly.`;
  }
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
