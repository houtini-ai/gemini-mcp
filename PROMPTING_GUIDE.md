# Gemini MCP Prompt Guide

A practical guide to getting the most out of the Gemini MCP server in Claude Desktop.

## Table of Contents

- [Quick Start](#quick-start)
- [Basic Prompts](#basic-prompts)
- [Model Selection](#model-selection)
- [Advanced Techniques](#advanced-techniques)
- [Google Search Grounding](#google-search-grounding)
- [Deep Research](#deep-research)
- [Creative Use Cases](#creative-use-cases)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## Quick Start

The Gemini MCP server works through Claude Desktop. Simply ask Claude to use Gemini, and it will automatically call the appropriate tools.

**Basic pattern**: `[Action] using Gemini [optional: model/parameters]`

---

## Basic Prompts

### Simple Queries

Ask Claude to use Gemini for any task:

```
Can you use Gemini to explain quantum computing in simple terms?
```

```
Use Gemini to write a haiku about coding.
```

```
Ask Gemini what the key differences are between Python and JavaScript.
```

### Checking Available Models

```
Show me all available Gemini models.
```

```
List the Gemini models and their capabilities.
```

```
What Gemini models can I use?
```

**Result**: You'll see all discovered models with their context window sizes and descriptions directly from Google's API.

---

## Model Selection

### Dynamic Model Discovery

The server **automatically discovers** the latest Gemini models from Google's API. This means:

- You always have access to the newest models
- Context window sizes are accurate and up-to-date
- The default model is automatically selected as the latest stable release
- No manual updates needed

**Default behaviour**: The server uses the latest stable (non-experimental) model, typically the newest Flash variant for optimal speed and performance.

### Using Specific Models

By default, the server uses the latest stable model. You can specify different models:

**For Complex Reasoning:**
```
Use Gemini 2.5 Pro to analyse this business strategy and provide detailed recommendations.
```

**For Speed:**
```
Use Gemini 2.0 Flash to quickly summarise this article.
```

**For Large Context:**
```
Use Gemini 1.5 Pro (it has a 2M token context window) to analyse this entire codebase.
```

### Commonly Available Models

Models are discovered dynamically, but typically include:

- **Latest Flash** - Fast, versatile, 1M tokens (usually the default)
- **Latest Pro** - Advanced reasoning, larger context
- **gemini-2.0-flash** - Fast and efficient
- **gemini-1.5-pro** - 2M token context window
- **gemini-1.5-flash** - Efficient and reliable

**Note**: The exact list and default model may vary as Google releases new versions. Use "List available models" to see current options.

### Temperature Control

Control randomness and creativity:

```
Use Gemini with temperature 0.2 to give me a precise, factual answer about climate change.
```

```
Use Gemini with temperature 0.9 to write a creative, imaginative short story.
```

**Temperature guide**:
- `0.0-0.3`: Precise, factual, deterministic
- `0.4-0.7`: Balanced (default: 0.7)
- `0.8-1.0`: Creative, varied, exploratory

### Token Limits

Control response length:

```
Use Gemini with max 500 tokens to give me a brief summary.
```

```
Use Gemini with max 4000 tokens to write a detailed technical explanation.
```

---

## Advanced Techniques

### System Prompts

Guide Gemini's behaviour with system prompts:

```
Use Gemini with the system prompt "You are a senior software architect specialising in distributed systems" to review this microservices design.
```

```
Ask Gemini to explain machine learning, but set a system prompt that says "Explain concepts using cooking analogies."
```

### Combining Parameters

```
Use Gemini 2.5 Pro with temperature 0.3, max tokens 2000, and the system prompt "You are a technical writer" to document this API.
```

### Multi-Step Workflows

**Research → Analysis → Report:**

```
1. First, use Gemini to research recent developments in quantum computing
2. Then use Gemini to analyse the implications for cybersecurity
3. Finally, use Gemini to create an executive summary
```

**Code Review Workflow:**

```
1. Use Gemini to analyse this code for potential bugs
2. Use Gemini to suggest performance improvements
3. Use Gemini to generate comprehensive unit tests
```

---

## Google Search Grounding

Google Search grounding is **enabled by default** and provides real-time information.

### When Grounding Helps

**Current Events:**
```
Use Gemini to tell me about the latest AI announcements this month.
```

**Real-Time Data:**
```
What are the current stock prices for major tech companies? (Use Gemini)
```

**Recent Developments:**
```
Use Gemini to explain the latest changes in UK data protection laws.
```

**Fact Checking:**
```
Can Gemini verify the latest statistics on renewable energy adoption?
```

### When to Disable Grounding

For purely creative or hypothetical tasks:

```
Use Gemini without web search to write a fictional story about time travel.
```

**Note**: Grounding adds citations and search queries to responses, making them longer but more accurate.

### Understanding Grounded Responses

Grounded responses include:
- **Source citations**: Links to websites used
- **Search queries**: The actual queries Gemini used
- **Multiple sources**: Information synthesised from several sites

---

## Deep Research

For complex topics requiring comprehensive analysis, use the deep research feature:

```
Use Gemini deep research to investigate the impact of quantum computing on cybersecurity.
```

### How Deep Research Works

Deep research performs multiple research iterations:
1. Broad initial exploration
2. Gap analysis
3. Targeted deep dives
4. Comprehensive synthesis

### Customising Research

**Specify iteration count:**
```
Use Gemini deep research with 7 iterations to create a comprehensive report on renewable energy trends.
```

**Add focus areas:**
```
Use Gemini deep research on AI in healthcare, focusing on diagnostic accuracy, cost implications, and regulatory challenges.
```

### Configuring Research Depth by Environment

The number of research iterations affects both quality and execution time. Different environments have different timeout tolerances:

**Claude Desktop (Recommended: 3-5 iterations)**
- **Timeout**: ~4 minutes
- **Best for**: Quick, focused research tasks
- **Example**:
  ```
  Use Gemini deep research with 3 iterations to analyse competitive landscape in renewable energy.
  ```

**Agent SDK / IDEs (VSCode, Cursor, Windsurf) (Recommended: 7-10 iterations)**
- **Timeout**: 10+ minutes
- **Best for**: Comprehensive, thorough research
- **Example**:
  ```
  Use Gemini deep research with 8 iterations to create a detailed market analysis of AI chip manufacturers.
  ```

**AI Platforms (Cline, Roo-Cline) (Recommended: 7-10 iterations)**
- **Timeout**: Similar to Agent SDK
- **Best for**: In-depth research and analysis

**If You Hit Limits**

If you encounter timeout or context errors:

1. **Reduce iterations**: Start with 3 and increase gradually
2. **Narrow focus**: Use `focus_areas` to be more specific
3. **Split research**: Break complex topics into smaller tasks

Example with focused research:
```
Use Gemini deep research with 3 iterations focusing on cost analysis and adoption rates to examine solar panel trends.
```

**Note**: The server manages context efficiently, so timeout issues are rare with recommended settings.

### When to Use Deep Research

- Academic research and literature reviews
- Market analysis and competitive intelligence
- Technology trend analysis
- Multi-faceted business problems

**Note**: Deep research takes several minutes but provides thorough, well-researched analysis with proper citations.

---

## Creative Use Cases

### Content Creation

```
Use Gemini to write a blog post about the benefits of TypeScript, aimed at JavaScript developers.
```

```
Ask Gemini to create 10 engaging social media posts about sustainable living.
```

### Code Generation

```
Use Gemini to write a Python function that validates email addresses using regex.
```

```
Ask Gemini to create a React component for a responsive navigation bar.
```

### Analysis and Insights

```
Use Gemini to analyse this customer feedback data and identify key themes.
```

```
Ask Gemini to review this marketing copy and suggest improvements for conversion.
```

### Learning and Education

```
Use Gemini to explain blockchain technology as if I'm 12 years old.
```

```
Ask Gemini to create a study guide for learning Node.js, structured as a 4-week plan.
```

### Brainstorming

```
Use Gemini with high temperature (0.9) to brainstorm 20 creative business names for a sustainable fashion brand.
```

```
Ask Gemini to suggest innovative features for a fitness tracking app.
```

---

## Troubleshooting

### "Rate Limit" or "Quota Exceeded" Errors

**Problem**: You're hitting API rate limits.

**Solution**:
1. If using experimental models, this is expected (they have stricter limits)
2. Wait a few seconds and retry
3. Use stable models (default) for better quota limits
4. Check your [Google AI Studio quota](https://ai.google.dev/pricing)

### Model Not Available

**Problem**: Requested model doesn't exist or isn't accessible.

**Solution**:
1. List available models first: "Show me all available Gemini models"
2. Use a model from that list
3. Restart Claude Desktop to refresh model discovery

### Unexpected Responses

**Problem**: Gemini's response seems off or filtered.

**Solution**:
1. Try adjusting temperature (lower for factual, higher for creative)
2. Add a clear system prompt to guide behaviour
3. Rephrase your question more specifically
4. Check if content filters triggered (rare with default settings)

### Grounding Not Working

**Problem**: Not seeing citations or current information.

**Solution**:
1. Grounding is enabled by default
2. Ask about recent events explicitly: "What are the latest developments in..."
3. Check server logs for grounding metadata
4. Ensure your query benefits from web search (current events, facts, etc.)

---

## Best Practices

### 1. Start Simple

Begin with basic prompts:
```
Use Gemini to explain recursion.
```

Then add complexity as needed:
```
Use Gemini 2.5 Pro with temperature 0.3 to explain recursion using real-world examples, suitable for beginners.
```

### 2. Be Specific

**Vague**:
```
Use Gemini to help with my code.
```

**Better**:
```
Use Gemini to review this Python function for bugs and suggest optimisations.
```

### 3. Choose the Right Model

- **Fast, general tasks** → Latest stable (typically Flash variant)
- **Complex reasoning** → Pro variants
- **Large documents** → Models with 2M token windows
- **Speed-critical** → Flash variants

### 4. Leverage System Prompts

Shape Gemini's expertise:
```
Use Gemini with system prompt "You are an expert DevOps engineer" to review this deployment configuration.
```

### 5. Iterate

Start broad, then refine:
```
1. Use Gemini to explain machine learning
2. Now use Gemini to explain neural networks specifically
3. Finally, use Gemini to show a simple neural network example in Python
```

### 6. Use Temperature Strategically

- **Factual questions** → Low (0.0-0.3)
- **Balanced responses** → Medium (0.4-0.7)
- **Creative writing** → High (0.8-1.0)

### 7. Combine with Claude

Let Claude and Gemini work together:
```
Use Gemini to research the latest React best practices, then help me apply them to refactor this component.
```

Claude can process Gemini's output and provide additional analysis.

### 8. Check Grounding Results

When grounding is used:
- Review the sources provided
- Check the search queries used
- Verify information from citations

### 9. Monitor Token Usage

For large requests:
- Use appropriate max_tokens settings
- Break large documents into chunks
- Consider context window limits

### 10. Stay Updated

Models improve over time:
- The default model is always the latest stable version
- New models appear automatically via dynamic discovery
- Check "List available models" to see current options with accurate context windows

---

## Example Workflows

### Research Workflow

```
1. Use Gemini to research current trends in artificial intelligence
2. Use Gemini to identify the top 3 most impactful trends
3. Use Gemini to explain the business implications of each trend
4. Use Gemini to create a one-page executive summary
```

**Alternative**: Use deep research for comprehensive analysis:
```
Use Gemini deep research to investigate current AI trends and their business implications.
```

### Content Creation Workflow

```
1. Use Gemini to brainstorm 10 blog post topics about sustainable technology
2. Use Gemini to create a detailed outline for the most interesting topic
3. Use Gemini to write the introduction and first section
4. Use Gemini to suggest compelling headlines and meta descriptions
```

### Code Development Workflow

```
1. Use Gemini to design the architecture for a REST API
2. Use Gemini to generate the Express.js boilerplate code
3. Use Gemini to create comprehensive unit tests
4. Use Gemini to write API documentation
```

### Learning Workflow

```
1. Use Gemini to explain [concept] in simple terms
2. Use Gemini to provide practical examples
3. Use Gemini to create practice exercises
4. Use Gemini to suggest additional resources
```

---

## Quick Reference

### Common Patterns

| Task | Example Prompt |
|------|----------------|
| Simple query | `Use Gemini to explain X` |
| Model selection | `Use Gemini 2.5 Pro to analyse X` |
| Temperature control | `Use Gemini with temperature 0.9 to write X` |
| System prompt | `Use Gemini with system prompt "You are X" to do Y` |
| Disable grounding | `Use Gemini without web search to create X` |
| List models | `Show me all available Gemini models` |
| Deep research | `Use Gemini deep research to investigate X` |

### Model Quick Pick

| Need | Use |
|------|-----|
| Default/Fast | Latest stable (automatic - typically Flash) |
| Complex reasoning | Pro variants |
| Large context | Models with 2M tokens (e.g., 1.5 Pro) |
| Maximum speed | Flash variants |

### Temperature Quick Pick

| Task Type | Temperature |
|-----------|-------------|
| Facts, code, analysis | 0.0 - 0.3 |
| General questions | 0.4 - 0.7 |
| Creative writing | 0.8 - 1.0 |

---

## Need Help?

- **Documentation**: See [README.md](README.md) for setup and configuration
- **Issues**: Report bugs at [GitHub Issues](https://github.com/houtini-ai/gemini-mcp/issues)
- **Discussions**: Ask questions at [GitHub Discussions](https://github.com/houtini-ai/gemini-mcp/discussions)

---

**Happy prompting!**