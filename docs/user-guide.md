# Gemini MCP - the user guide

I've had this server running in my Claude Desktop setup for the best part of a year. It's one of the few I leave switched on all the time. Not because Gemini replaces Claude - it doesn't - but because grounded search, image generation, SVG diagrams and video are things Gemini does well, and I'd rather have them as tools inside Claude than keep flipping between browser tabs.

This guide is the long version. The [README](../README.md) gets you installed in two minutes; this walks through what each tool's actually for, how I use it day to day, and the handful of things that trip people up. If you only read one section, make it [the free-tier gotcha](#the-free-tier-gotcha) - it's the thing that catches nearly everyone on their first go.

## Quick map

- [Before you start](#before-you-start)
- [Getting it running](#getting-it-running)
- [The free-tier gotcha](#the-free-tier-gotcha)
- [The tools, one at a time](#the-tools-one-at-a-time)
- [Where your files go](#where-your-files-go)
- [When something's wrong](#when-somethings-wrong)

---

## Before you start

You need three things. A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey), Node 20.19 or newer, and about two minutes. ffmpeg is optional - you only need it if you want thumbnails pulled out of generated videos, and everything else works without it.

That's it. No database, no separate install step, no build unless you want to run from source.

## Getting it running

**Claude Desktop.** Open your config file - on Windows it's at `C:\Users\{you}\AppData\Roaming\Claude\claude_desktop_config.json`, on macOS it's `~/Library/Application Support/Claude/claude_desktop_config.json` - and add the server:

```json
{
  "mcpServers": {
    "gemini": {
      "command": "npx",
      "args": ["@houtini/gemini-mcp"],
      "env": {
        "GEMINI_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

Restart Claude Desktop. The tools show up on their own. `npx` pulls the package the first time, so there's nothing to install by hand.

**Claude Code.** Different mechanism - it doesn't read that config file. Use the CLI instead:

```bash
claude mcp add -e GEMINI_API_KEY=your-api-key-here -s user gemini -- npx -y @houtini/gemini-mcp
```

Then `claude mcp get gemini` and check it says `Status: Connected`.

**Did it work?** Ask Claude to run `gemini_list_models`. If you get a list back, you're connected and your key's valid. If you don't, jump to [When something's wrong](#when-somethings-wrong).

## The free-tier gotcha

Here's the one that catches people. The defaults lean on paid models, because that's what produces the best results - and a brand-new free key can't call them.

As it stands, `gemini_chat` and `generate_landing_page` default to `gemini-4-argon` (Gemini 4 Argon, the current flagship), and `gemini_deep_research` and `analyze_image` default to `gemini-3.1-pro-preview`. Both are paid-only. On a free key those calls come back with an API error about the key not being valid for the model, which looks scarier than it is.

The fix is one of two things. Point the defaults at a free model with environment variables:

```json
"env": {
  "GEMINI_API_KEY": "your-api-key-here",
  "GEMINI_DEFAULT_MODEL": "gemini-3-flash-preview",
  "GEMINI_DEEP_RESEARCH_MODEL": "gemini-3-flash-preview",
  "GEMINI_IMAGE_ANALYSIS_MODEL": "gemini-3-flash-preview"
}
```

`GEMINI_DEFAULT_MODEL` covers chat and landing pages in one go. Or, if you only need it now and then, pass `model: "gemini-3-flash-preview"` on the individual call and leave the defaults alone.

`generate_svg` already defaults to a free model (`gemini-3-flash-preview`), so that one works out of the box. Image generation is a different story - Nano Banana Pro is paid, and there's no free substitute that does the same job, so image generation needs a paid key regardless.

Google moves these tiers around, so check the [pricing page](https://ai.google.dev/gemini-api/docs/pricing) before you rely on any of it. In my experience it's worth the paid key once you're using the image tools properly, but there's no sense paying for a model you're not touching.

## The tools, one at a time

Fourteen tools. You won't use all of them every day, but here's what each is for and the bits worth knowing.

### gemini_chat - grounded chat

```
Use gemini:gemini_chat to ask: "What changed in the MCP spec in the last month?"
```

Grounding's on by default, so Gemini searches Google before it answers and you get this month's information instead of a training-cutoff guess. Sources come back as markdown links. If you want pure reasoning with no search - explaining code, say - set `grounding: false`.

Runs on Argon unless you pass something else. For speed over depth, `model: "gemini-3.8-flash"`. And `thinking_level` works on the Gemini 3.x and 4 models: `high` when the problem's hard, `low` when you want it quick.

One thing. **Don't set `max_tokens`.** I know it's tempting to cap it. Don't. On the thinking models a small cap gets spent on hidden reasoning before you see a single word of output, and the empty result looks exactly like a timeout. The server hands the model its full output ceiling on its own, and unused headroom costs you nothing. Leave it alone and it just works.

### gemini_deep_research - the long one

```
Use gemini:gemini_deep_research with:
  research_question="What are the current approaches to AI agent memory management?"
  max_iterations=3
```

This runs several grounded search passes, then writes them up as one report. The passes run on a fast Flash model (they're gathering facts, not reasoning about them) and the synthesis at the end runs on 3.1 Pro with full thinking. Two passes plus a synthesis is the default and lands in two to three minutes.

That split matters. An earlier version ran everything on Pro with full thinking, and a single broad question could run past Claude Desktop's four-minute tool timeout on its own. Really not ideal. So keep `max_iterations` at 2 or 3 in Claude Desktop. In an IDE or an agent framework where the timeout's longer, 5 to 7 produces a noticeably better write-up. Pass `focus_areas` as an array if you want to steer each pass at something specific.

### generate_image - the headline act

```
Use gemini:generate_image with:
  prompt="A cinematic product shot of a mechanical keyboard on a walnut desk"
  aspectRatio="16:9"
  imageSize="2K"
```

Default is `gemini-3-pro-image` - Nano Banana Pro. It's the one that renders text correctly, does 4K, and takes reference images. If you want volume over absolute fidelity, `model: "gemini-3.1-flash-image"` (Nano Banana 2) is a fraction of the time and cost and still very good. There's a Lite variant below that if you're generating in bulk.

Set `use_search=true` and Gemini looks things up before it draws - weather, prices, sports results, anything data-driven. I've used it for a five-day forecast poster where the temperatures were real, pulled live. `aspectRatio` takes `1:1`, `3:4`, `4:3`, `9:16`, `16:9`; `imageSize` takes `1K`, `2K`, `4K` on the image-specific models.

The full-resolution file always saves to disk. What comes back inline in Claude is a resized preview that fits under the transport cap, but the original on disk is untouched. More on where it lands in [Where your files go](#where-your-files-go).

### edit_image - change it with a sentence

```
Use gemini:edit_image with:
  prompt="Change the track to a daytime lap at Monza and make the pedals red"
  images=[{filePath: "C:/output/gemini-123.png"}]
```

Point it at an image and tell it what to change in plain English. Nano Banana Pro keeps context between turns, so for a multi-step edit you pass the `thoughtSignature` from the previous call back in and it remembers what it was working on. Pass images by `filePath` and the server reads them itself, which skips the transport limit entirely - much better than base64 for anything large.

### describe_image and analyze_image - two jobs, two tools

`describe_image` is the quick one - a general description on `gemini-3.8-flash`. `analyze_image` is for when you need structured extraction or proper reasoning about what's in the picture, and it runs on `gemini-3.1-pro-preview`. Different tools because they're different jobs; don't reach for the Pro one when a fast description will do.

Both take `filePath` images. There's also `load_image_from_path` if you just want to pull a local file into base64 for another tool.

### generate_video - Veo 3.1

```
Use gemini:generate_video with:
  prompt="A close-up of a coffee machine brewing a glowing blue espresso, steam rising. Cinematic lighting."
  resolution="1080p"
  durationSeconds=8
```

Four to eight second clips at up to 4K, with native synchronised audio. It's asynchronous on Google's side and takes two to five minutes - the tool polls until it's ready so you don't have to sit there refreshing anything.

The options I actually use: `firstFrameImage` animates from a still (pass a `filePath`), which is how you get a product shot to come alive; `referenceImages` takes up to three for character or style consistency; `generateAudio` is on by default and gives you dialogue and effects that match the prompt. `generateThumbnail` pulls a frame out with ffmpeg if you've got it in your PATH - no ffmpeg, no thumbnail, but the video still saves fine. And `model: "veo-3.1-lite-generate-preview"` if you want cheaper and faster.

### generate_svg - the underrated one

```
Use gemini:generate_svg with:
  prompt="Architecture diagram: API gateway, three services, a shared database"
  style="technical"
  width=1000
  height=600
```

People underestimate this one. It's not a picture of a diagram - it's the SVG markup itself, which means you can drop it straight into a page, edit it by hand, or commit it to a repo, and it scales with no raster mush. Four styles: `technical` for diagrams and flowcharts, `artistic` for illustrations, `minimal` for clean charts, `data-viz` for dashboards and infographics.

Runs on `gemini-3-flash-preview` by default - quick, handles SVG comfortably, and it's on the free tier. Pass `model: "gemini-3.1-pro-preview"` for denser diagrams if you're on a paid key.

### generate_landing_page - a page from a paragraph

```
Use gemini:generate_landing_page with:
  brief="A tool that helps developers monitor API latency across regions"
  companyName="PingWatch"
  primaryColour="#6366F1"
  style="startup"
  sections=["hero", "features", "pricing", "cta"]
```

One self-contained HTML file - inline CSS, vanilla JS, no external dependencies. Styles are `minimal`, `bold`, `corporate` and `startup`. It defaults to the same model as chat (Argon), so the free-tier note applies here too.

### gemini_prompt_assistant and gemini_help

`gemini_prompt_assistant` carries nine chart design systems you can ask for by name - Financial Times, Bloomberg terminal, W.E.B. Du Bois, Tufte, that sort of thing - when you want a chart image that looks like it came from somewhere with a house style.

`gemini_help` is the documentation without leaving Claude. `topic="overview"` to start, or `image_generation`, `chat`, `deep_research`, `models` and so on.

There's one more, `gemini_viewer_payload`, but you'll never call it - it's internal plumbing the inline viewers use. More on that next.

## Where your files go

By default, images come back as an inline preview in Claude and the full-size file lands next to the package. Set `GEMINI_IMAGE_OUTPUT_DIR` and everything goes somewhere sensible instead:

```json
"env": {
  "GEMINI_API_KEY": "your-api-key-here",
  "GEMINI_IMAGE_OUTPUT_DIR": "C:/Users/you/Pictures/gemini-output"
}
```

You get two files per image: the full-resolution original, saved untouched, and a resized JPEG preview for the inline view. The preview's sized down to fit under the 1MB transport cap; the original isn't touched. And the file on disk matches its extension now - if you ask for a `.png` you get a real PNG, even though Gemini often hands back JPEG bytes. If you don't want the bloat of a photo saved as PNG, ask for a `.jpg` and it writes the bytes straight through.

**The inline viewers.** Image, SVG, video and landing-page results open in a little viewer inside Claude Desktop with zoom, the saved path and a copy button. If you're on an older version and the viewer just sat there saying "Waiting for image..." forever, that was Claude Desktop stripping the data the viewer reads. It's fixed - since 2.7.0 the viewer fetches the data back itself, which is what `gemini_viewer_payload` is quietly doing. Upgrade and it renders either way.

## When something's wrong

Most of what goes wrong is one of these. In rough order of how often I've seen it.

**Empty output that looks like a timeout.** You set `max_tokens` too low. The thinking models spend a small budget on hidden reasoning before any visible text, so a tight cap gets burned before you see a word. Don't set `max_tokens` at all - the server sizes it for you. This is the single most common one.

**"API key not valid for this model" on a free key.** You're hitting a paid default - Argon on chat, 3.1 Pro on research or analysis. Point them at a free model with the env vars in [the free-tier gotcha](#the-free-tier-gotcha), or pass `model` per call.

**Deep research times out in Claude Desktop.** There's a four-minute tool cap and a big research run can exceed it. Drop `max_iterations` to 2 or 3. If you want the deeper 5-to-7-pass version, run it somewhere with a longer timeout - an IDE or an agent framework.

**`fetch failed` behind a proxy, VPN or WSL2.** Those connection drops are retried automatically now, with backoff. If your network's especially flaky, bump `GEMINI_MCP_RETRY_ATTEMPTS` (default 3) - set it higher, or `1` to turn retries off. A bad key still fails fast; only genuine connection wobbles get replayed, and nothing that costs money gets submitted twice.

**No video thumbnail.** You need ffmpeg in your PATH for `generateThumbnail`. Without it the video still saves - you just don't get the extracted frame.

**Want to see what your key can actually call?** Run `gemini_list_models`. It lists everything your key can reach for text and image generation. Worth doing before you trust any model name from a blog post - Google's lineup moves fast.

**Logs.** Set `GEMINI_MCP_LOG_FILE=true` and it writes to `~/.gemini-mcp/logs/`, which is the first thing to grab if you're reporting a bug. `DEBUG_MCP=true` sends logs to stderr if you're watching a tool call live.

---

That's the lot. If you hit something that isn't here, the [issues page](https://github.com/houtini-ai/gemini-mcp/issues) is the place - a screenshot and the log file gets it sorted fastest. Have fun with it.
