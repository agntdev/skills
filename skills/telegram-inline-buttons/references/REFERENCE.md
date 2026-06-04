# Inline Keyboard Reference

## Telegram Bot API Limits

| Limit | Value |
|---|---|
| Max buttons per keyboard | 100 |
| Max buttons per row | 8 |
| `callback_data` max length | 64 bytes (1-64) |
| `text` max length | 1-128 characters (empty string not allowed for some types) |
| Same `callback_data` on multiple buttons | Allowed (will trigger same handler) |

## InlineKeyboardButton Fields

| Field | Type | Description |
|---|---|---|
| `text` | string | Label text (1-128 chars). Can use emoji |
| `url` | string | HTTP or tg:// URL to open |
| `callback_data` | string (1-64 bytes) | Data sent back on press |
| `web_app` | WebAppInfo | Telegram Mini App to open |
| `login_url` | LoginUrl | Telegram Login Widget URL |
| `switch_inline_query` | string | Prompt to start inline query (any chat) |
| `switch_inline_query_current_chat` | string | Prompt to start inline query (current chat) |
| `callback_game` | CallbackGame | Launch a Telegram game (HTML5) |
| `pay` | bool | "Pay" button for payments |
| `copy_text` | CopyTextButton | Copy text to clipboard |
| *Exactly ONE optional field required* | | Button without action renders non-interactive |

## InlineKeyboardMarkup Fields

| Field | Type | Description |
|---|---|---|
| `inline_keyboard` | Array of Array of InlineKeyboardButton | 2D button grid (rows × columns) |

## AnswerCallbackQuery Parameters

| Parameter | Type | Description |
|---|---|---|
| `callback_query_id` | string | ID from the callback query |
| `text` | string (0-200 chars) | Notification text |
| `show_alert` | bool | Show as alert (not toast) |
| `url` | string | URL to open (game URLs) |
| `cache_time` | int | How long result is cached (seconds) |

## Library-Specific Helpers

| Library | Inline Keyboard Builder |
|---|---|
| grammY (TS) | `new InlineKeyboard().text(...).url(...).row()` |
| Telegraf (TS) | `Markup.inlineKeyboard([...])` |
| python-telegram-bot | `InlineKeyboardMarkup([[InlineKeyboardButton(...)]])` |
| aiogram (Python) | `InlineKeyboardMarkup(inline_keyboard=[...])` |
| telebot (Go) | `tgbotapi.NewInlineKeyboardMarkup(...)` |
| teloxide (Rust) | `vec![vec![InlineKeyboardButton::callback(...)]]` |

## Official Docs

- [Telegram Bot API: InlineKeyboardMarkup](https://core.telegram.org/bots/api#inlinekeyboardmarkup)
- [Telegram Bot API: InlineKeyboardButton](https://core.telegram.org/bots/api#inlinekeyboardbutton)
- [Telegram Bot API: AnswerCallbackQuery](https://core.telegram.org/bots/api#answercallbackquery)
- [Telegram Mini Apps](https://core.telegram.org/bots/webapps)
