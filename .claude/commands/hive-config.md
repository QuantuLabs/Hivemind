---
description: Configure Hivemind Settings
allowed-tools:
  - AskUserQuestion
  - mcp__hivemind__check_status
  - mcp__hivemind__configure_keys
  - mcp__hivemind__configure_hive
---

# /hive-config - Configure Hivemind Settings

Interactive configuration for the Hivemind multi-model consensus system.

## Step 1: Check Current Status

First, call the `check_status` tool to understand the current configuration state.

## Step 2: Show Status Summary

Display the current status to the user:

```
## Hivemind Configuration Status

### API Keys
| Provider | Status | Source |
|----------|--------|--------|
| OpenAI | [✅ Configured / ❌ Not configured] | [env / .env file / -] |
| Google | [✅ Configured / ❌ Not configured] | [env / .env file / -] |
| Anthropic | [✅ Configured / ❌ Not configured] | [skipped in Claude Code] |

### Settings
- Grounding Search: [Enabled/Disabled]
- Claude Code Mode: [Enabled/Disabled]

### Config File
~/.config/hivemind/.env
```

## Step 3: Present Main Menu

Use AskUserQuestion:

```json
{
  "questions": [
    {
      "question": "What would you like to do?",
      "header": "Action",
      "multiSelect": false,
      "options": [
        {
          "label": "Add API Keys",
          "description": "Paste your OpenAI or Google API keys"
        },
        {
          "label": "Edit .env File",
          "description": "Show path to manually edit the config file"
        },
        {
          "label": "Change Settings",
          "description": "Toggle grounding search or Claude Code mode"
        },
        {
          "label": "Setup Guide",
          "description": "First-time setup instructions"
        }
      ]
    }
  ]
}
```

## Step 4: Handle User Selection

### If "Add API Keys" Selected

Use AskUserQuestion to select providers:

```json
{
  "questions": [
    {
      "question": "Which API keys do you want to add? (In Claude Code, you only need OpenAI and/or Google)",
      "header": "Providers",
      "multiSelect": true,
      "options": [
        {
          "label": "OpenAI (Recommended)",
          "description": "GPT-5.2 - get key at platform.openai.com/api-keys"
        },
        {
          "label": "Google (Recommended)",
          "description": "Gemini 3 Pro - get key at aistudio.google.com/apikey"
        },
        {
          "label": "Anthropic (Optional)",
          "description": "Only needed outside Claude Code"
        }
      ]
    }
  ]
}
```

For each selected provider, ask the user to paste their key using AskUserQuestion with "Other" option:

```json
{
  "questions": [
    {
      "question": "Paste your [Provider] API key:",
      "header": "[Provider]",
      "multiSelect": false,
      "options": [
        {
          "label": "I'll paste it",
          "description": "Select this and type/paste your key in the text field"
        }
      ]
    }
  ]
}
```

The user will select "Other" and paste their key. Then call `configure_keys` with the provided key(s):

```
configure_keys({ openai: "sk-...", google: "AIza..." })
```

After saving, confirm:
```
✅ API keys saved to ~/.config/hivemind/.env
```

### If "Edit .env File" Selected

Display:

```
## Manual Configuration

Edit the file directly:

~/.config/hivemind/.env

Add your keys:

OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AIza...

(Anthropic key optional in Claude Code)

After editing, restart Claude Code or run /hive-config to verify.
```

### If "Change Settings" Selected

Use AskUserQuestion:

```json
{
  "questions": [
    {
      "question": "Which setting do you want to change?",
      "header": "Setting",
      "multiSelect": false,
      "options": [
        {
          "label": "Grounding Search",
          "description": "Currently [Enabled/Disabled] - Google Search for real-time data"
        },
        {
          "label": "Claude Code Mode",
          "description": "Currently [Enabled/Disabled] - Skip Anthropic API"
        }
      ]
    }
  ]
}
```

Then ask to enable/disable and call `configure_hive`.

### If "Setup Guide" Selected

Display:

```
## Hivemind Setup Guide

### What you need
- OpenAI key: https://platform.openai.com/api-keys
- Google key: https://aistudio.google.com/apikey
- (No Anthropic key needed - Claude is already here!)

### Option 1: Paste keys now
Run `/hive-config` > "Add API Keys" > paste your keys

### Option 2: Edit .env file
Create ~/.config/hivemind/.env:

OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AIza...

### Verify
Run `/hive-config` to check status

### Use Hivemind
/hive "your question here"
```

## Step 5: Confirm Changes

After any changes, call `check_status` and show updated status.

## Quick Arguments

- `/hive-config status` - Show status only
- `/hive-config keys` - Go to API key config
- `/hive-config settings` - Go to settings
- `/hive-config guide` - Show setup guide

Check `$ARGUMENTS` and skip to the relevant step if provided.
