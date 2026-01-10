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

Parse the response to determine:
- Which API keys are configured and their source (env = system env var, dotenv = ~/.config/hivemind/.env)
- Current settings (grounding, Claude Code mode)
- Active providers
- Path to the .env file for manual editing

## Step 2: Show Status Summary

Display the current status to the user in a clear format:

```
## Hivemind Configuration Status

### API Keys
- OpenAI: [Configured via env / Configured via .env file / Not configured]
- Anthropic: [Configured via env / Configured via .env file / Not configured]
- Google: [Configured via env / Configured via .env file / Not configured]

### Settings
- Grounding Search: [Enabled/Disabled]
- Claude Code Mode: [Enabled/Disabled]

### Config File
~/.config/hivemind/.env (you can edit this file directly)

### Active Providers
[List of currently active providers]
```

## Step 3: Present Main Menu

Use AskUserQuestion to present the main menu:

```json
{
  "questions": [
    {
      "question": "What would you like to configure?",
      "header": "Action",
      "multiSelect": false,
      "options": [
        {
          "label": "API Keys",
          "description": "Configure OpenAI, Anthropic, or Google API keys"
        },
        {
          "label": "Settings",
          "description": "Toggle grounding search or Claude Code mode"
        },
        {
          "label": "View Status Only",
          "description": "Just show current configuration"
        },
        {
          "label": "Setup Guide",
          "description": "Step-by-step first-time setup instructions"
        }
      ]
    }
  ]
}
```

## Step 4: Handle User Selection

### If "API Keys" Selected

Use AskUserQuestion to ask about configuration method:

```json
{
  "questions": [
    {
      "question": "How would you like to configure API keys?",
      "header": "Method",
      "multiSelect": false,
      "options": [
        {
          "label": "Environment Variables (Recommended)",
          "description": "Set OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY in your shell"
        },
        {
          "label": "Manual Entry",
          "description": "Enter API keys directly (stored in ~/.config/hivemind/.env)"
        },
        {
          "label": "Edit .env File",
          "description": "Open the .env file path to edit manually"
        }
      ]
    }
  ]
}
```

#### If "Environment Variables" Selected

Display instructions:

```
## Configuring API Keys via Environment Variables (Recommended)

Add these lines to your shell profile (~/.zshrc or ~/.bashrc):

export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export GOOGLE_API_KEY="AIza..."

After adding:
1. Run `source ~/.zshrc` (or restart your terminal)
2. Restart Claude Code for changes to take effect
3. Run `/hive-config` again to verify

**Why environment variables?**
- Keys are not exposed in the terminal
- Easy to manage across projects
- Standard practice for API credentials
- Works automatically with Claude Code
```

#### If "Manual Entry" Selected

Use AskUserQuestion to select which provider:

```json
{
  "questions": [
    {
      "question": "Which provider's API key do you want to configure?",
      "header": "Provider",
      "multiSelect": true,
      "options": [
        {
          "label": "OpenAI",
          "description": "GPT models - get key at platform.openai.com"
        },
        {
          "label": "Anthropic",
          "description": "Claude models - get key at console.anthropic.com"
        },
        {
          "label": "Google",
          "description": "Gemini models - get key at aistudio.google.com"
        }
      ]
    }
  ]
}
```

For each selected provider, ask the user to provide their key. Then call `configure_keys` with the provided key(s).

**Note:** Keys entered manually are stored in `~/.config/hivemind/.env`. The key will be visible in the terminal during entry.

#### If "Edit .env File" Selected

Display the path to the .env file:

```
## Edit API Keys Directly

You can edit your API keys directly in the .env file:

~/.config/hivemind/.env

Add or modify these lines:

OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...

The file will be created automatically if it doesn't exist when you add a key via "Manual Entry".
```

### If "Settings" Selected

Use AskUserQuestion to select which settings to toggle:

```json
{
  "questions": [
    {
      "question": "Which settings would you like to change?",
      "header": "Settings",
      "multiSelect": true,
      "options": [
        {
          "label": "Grounding Search",
          "description": "Google Search grounding for real-time web data in Gemini responses"
        },
        {
          "label": "Claude Code Mode",
          "description": "Skip Anthropic API when running inside Claude Code (saves costs)"
        }
      ]
    }
  ]
}
```

For each selected setting, ask whether to enable or disable, then call `configure_hive` with the new values.

### If "Setup Guide" Selected

Display step-by-step first-time setup instructions:

```
## Hivemind First-Time Setup Guide

Hivemind queries multiple AI models to reach consensus. Here's how to set it up:

### Step 1: Get API Keys

You need at least one API key (all three recommended):

1. **OpenAI** (GPT-5.2)
   - Go to: https://platform.openai.com/api-keys
   - Create a new API key
   - Key format: sk-...

2. **Anthropic** (Claude Opus 4.5)
   - Go to: https://console.anthropic.com/settings/keys
   - Create a new API key
   - Key format: sk-ant-...

3. **Google** (Gemini 3 Pro)
   - Go to: https://aistudio.google.com/apikey
   - Create a new API key
   - Key format: AIza...

### Step 2: Configure Keys

**Option A: Environment Variables (Recommended)**

Add to your shell profile (~/.zshrc or ~/.bashrc):

export OPENAI_API_KEY="your-key-here"
export ANTHROPIC_API_KEY="your-key-here"
export GOOGLE_API_KEY="your-key-here"

Then restart your terminal and Claude Code.

**Option B: Manual Configuration**

Run `/hive-config` and select "API Keys" > "Manual Entry"

### Step 3: Verify Setup

Run `/hive-config` to see your configuration status.

### Step 4: Use Hivemind

Run `/hive [your question]` to query the multi-model consensus system.
```

## Step 5: Confirm Changes

After any configuration changes, call `check_status` again and display the updated status.

```
## Configuration Updated

[Show updated status summary]

Your changes have been applied. Use `/hive [question]` to query the Hivemind.
```

## Arguments

- `$ARGUMENTS` - Optional quick actions:
  - `status` - Show current status only
  - `keys` - Go directly to API key configuration
  - `settings` - Go directly to settings configuration
  - `guide` - Show setup guide

If `$ARGUMENTS` matches one of these, skip the main menu and go directly to that action.
