import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { WebClient } from "@slack/web-api";
import { z } from "zod";

const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN || "xoxb-11408146488758-11403905906803-7CZZW8Pc9v5Ydl5mG6BvjrbJ";
const web = new WebClient(SLACK_TOKEN);

const server = new Server(
  {
    name: "slack-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tools Definition List
const TOOLS = [
  {
    name: "list_channels",
    description: "Retrieve a list of public and private channels in the workspace.",
    inputSchema: {
      type: "object",
      properties: {
        types: {
          type: "string",
          description: "Mix of public_channel, private_channel (comma-separated)",
          default: "public_channel,private_channel"
        },
        limit: {
          type: "number",
          description: "Max channels to fetch",
          default: 100
        }
      }
    }
  },
  {
    name: "get_channel_messages",
    description: "Get messages history from a specific channel.",
    inputSchema: {
      type: "object",
      properties: {
        channel: { type: "string", description: "Channel ID (e.g. C0BCWEU3WJU)" },
        limit: { type: "number", description: "Number of messages to retrieve", default: 50 },
        cursor: { type: "string", description: "Pagination cursor" }
      },
      required: ["channel"]
    }
  },
  {
    name: "search_messages",
    description: "Search messages across the workspace matching a query.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query keywords" },
        count: { type: "number", description: "Number of search results", default: 20 }
      },
      required: ["query"]
    }
  },
  {
    name: "get_thread",
    description: "Get replies to a thread message.",
    inputSchema: {
      type: "object",
      properties: {
        channel: { type: "string", description: "Channel ID where thread exists" },
        thread_ts: { type: "string", description: "Timestamp of parent message (thread_ts)" }
      },
      required: ["channel", "thread_ts"]
    }
  },
  {
    name: "get_user",
    description: "Get profile information for a specific Slack user.",
    inputSchema: {
      type: "object",
      properties: {
        user: { type: "string", description: "User ID (e.g. U12345)" }
      },
      required: ["user"]
    }
  },
  {
    name: "list_users",
    description: "Get a list of users in the workspace.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max users to fetch", default: 100 }
      }
    }
  },
  {
    name: "get_files",
    description: "List files shared in the workspace.",
    inputSchema: {
      type: "object",
      properties: {
        channel: { type: "string", description: "Filter files in specific channel ID" },
        user: { type: "string", description: "Filter files shared by specific user ID" },
        limit: { type: "number", description: "Max files to fetch", default: 20 }
      }
    }
  },
  {
    name: "send_message",
    description: "Send a message to a channel.",
    inputSchema: {
      type: "object",
      properties: {
        channel: { type: "string", description: "Channel ID or name" },
        text: { type: "string", description: "Text content of the message" }
      },
      required: ["channel", "text"]
    }
  },
  {
    name: "reply_to_thread",
    description: "Send a reply to an existing message thread.",
    inputSchema: {
      type: "object",
      properties: {
        channel: { type: "string", description: "Channel ID" },
        thread_ts: { type: "string", description: "Parent message timestamp" },
        text: { type: "string", description: "Message text" }
      },
      required: ["channel", "thread_ts", "text"]
    }
  },
  {
    name: "create_channel_post",
    description: "Create a rich formatted post in a channel (supports blocks).",
    inputSchema: {
      type: "object",
      properties: {
        channel: { type: "string", description: "Channel ID" },
        text: { type: "string", description: "Fallback text message" },
        blocks: { type: "string", description: "JSON stringified block layout array" }
      },
      required: ["channel", "text"]
    }
  },
  {
    name: "send_dm",
    description: "Open a direct message with a user and send a message.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { type: "string", description: "User ID to DM" },
        text: { type: "string", description: "Message content" }
      },
      required: ["user_id", "text"]
    }
  },
  {
    name: "channel_activity",
    description: "Get activity analysis for workspace channels.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max channels to scan", default: 5 }
      }
    }
  },
  {
    name: "user_activity",
    description: "Get active participation analysis of workspace users.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max users to analyze", default: 10 }
      }
    }
  },
  {
    name: "thread_metrics",
    description: "Get metrics on thread responsiveness and unanswered questions.",
    inputSchema: {
      type: "object",
      properties: {
        channel: { type: "string", description: "Channel ID to analyze" }
      },
      required: ["channel"]
    }
  }
];

// List Tools Handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

// Call Tool Handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "list_channels": {
        const parsed = z.object({
          types: z.string().optional().default("public_channel,private_channel"),
          limit: z.number().optional().default(100),
        }).parse(args);

        try {
          const res = await web.conversations.list({
            types: parsed.types,
            limit: parsed.limit,
            exclude_archived: true,
          });
          return {
            content: [{ type: "text", text: JSON.stringify(res.channels || []) }],
          };
        } catch (error: any) {
          if (error.message.includes("missing_scope") && parsed.types.includes("private_channel")) {
            const res = await web.conversations.list({
              types: "public_channel",
              limit: parsed.limit,
              exclude_archived: true,
            });
            return {
              content: [{ type: "text", text: JSON.stringify(res.channels || []) }],
            };
          }
          throw error;
        }
      }

      case "get_channel_messages": {
        const parsed = z.object({
          channel: z.string(),
          limit: z.number().optional().default(50),
          cursor: z.string().optional(),
        }).parse(args);

        const res = await web.conversations.history({
          channel: parsed.channel,
          limit: parsed.limit,
          cursor: parsed.cursor,
        });

        return {
          content: [{ type: "text", text: JSON.stringify(res.messages || []) }],
        };
      }

      case "search_messages": {
        const parsed = z.object({
          query: z.string(),
          count: z.number().optional().default(20),
        }).parse(args);

        // Fallback check if search.messages fails due to lacking user scopes
        try {
          const res = await web.search.messages({
            query: parsed.query,
            count: parsed.count,
          });
          return {
            content: [{ type: "text", text: JSON.stringify(res.messages?.matches || []) }],
          };
        } catch (searchError: any) {
          // If search.messages fails, fallback to scanning channels
          const channelsRes = await web.conversations.list({ limit: 20 });
          const matches: any[] = [];
          if (channelsRes.channels) {
            for (const ch of channelsRes.channels) {
              if (ch.id) {
                try {
                  const history = await web.conversations.history({ channel: ch.id, limit: 100 });
                  if (history.messages) {
                    const filtered = history.messages.filter(m => 
                      m.text && m.text.toLowerCase().includes(parsed.query.toLowerCase())
                    ).map(m => ({ ...m, channel: { id: ch.id, name: ch.name } }));
                    matches.push(...filtered);
                  }
                } catch (e) {}
              }
            }
          }
          return {
            content: [{ type: "text", text: JSON.stringify(matches.slice(0, parsed.count)) }],
          };
        }
      }

      case "get_thread": {
        const parsed = z.object({
          channel: z.string(),
          thread_ts: z.string(),
        }).parse(args);

        const res = await web.conversations.replies({
          channel: parsed.channel,
          ts: parsed.thread_ts,
        });

        return {
          content: [{ type: "text", text: JSON.stringify(res.messages || []) }],
        };
      }

      case "get_user": {
        const parsed = z.object({
          user: z.string(),
        }).parse(args);

        const res = await web.users.info({
          user: parsed.user,
        });

        return {
          content: [{ type: "text", text: JSON.stringify(res.user || null) }],
        };
      }

      case "list_users": {
        const parsed = z.object({
          limit: z.number().optional().default(100),
        }).parse(args);

        const res = await web.users.list({
          limit: parsed.limit,
        });

        return {
          content: [{ type: "text", text: JSON.stringify(res.members || []) }],
        };
      }

      case "get_files": {
        const parsed = z.object({
          channel: z.string().optional(),
          user: z.string().optional(),
          limit: z.number().optional().default(20),
        }).parse(args);

        const res = await web.files.list({
          channel: parsed.channel,
          user: parsed.user,
          count: parsed.limit,
        });

        return {
          content: [{ type: "text", text: JSON.stringify(res.files || []) }],
        };
      }

      case "send_message": {
        const parsed = z.object({
          channel: z.string(),
          text: z.string(),
        }).parse(args);

        const res = await web.chat.postMessage({
          channel: parsed.channel,
          text: parsed.text,
        });

        return {
          content: [{ type: "text", text: JSON.stringify({ success: res.ok, ts: res.ts, channel: res.channel }) }],
        };
      }

      case "reply_to_thread": {
        const parsed = z.object({
          channel: z.string(),
          thread_ts: z.string(),
          text: z.string(),
        }).parse(args);

        const res = await web.chat.postMessage({
          channel: parsed.channel,
          thread_ts: parsed.thread_ts,
          text: parsed.text,
        });

        return {
          content: [{ type: "text", text: JSON.stringify({ success: res.ok, ts: res.ts, channel: res.channel }) }],
        };
      }

      case "create_channel_post": {
        const parsed = z.object({
          channel: z.string(),
          text: z.string(),
          blocks: z.string().optional(),
        }).parse(args);

        let parsedBlocks = undefined;
        if (parsed.blocks) {
          try {
            parsedBlocks = JSON.parse(parsed.blocks);
          } catch (e) {}
        }

        const res = await web.chat.postMessage({
          channel: parsed.channel,
          text: parsed.text,
          blocks: parsedBlocks,
        });

        return {
          content: [{ type: "text", text: JSON.stringify({ success: res.ok, ts: res.ts, channel: res.channel }) }],
        };
      }

      case "send_dm": {
        const parsed = z.object({
          user_id: z.string(),
          text: z.string(),
        }).parse(args);

        const openRes = await web.conversations.open({
          users: parsed.user_id,
        });

        if (!openRes.ok || !openRes.channel?.id) {
          throw new Error("Could not open DM channel with user");
        }

        const res = await web.chat.postMessage({
          channel: openRes.channel.id,
          text: parsed.text,
        });

        return {
          content: [{ type: "text", text: JSON.stringify({ success: res.ok, ts: res.ts, channel: res.channel }) }],
        };
      }

      case "channel_activity": {
        const parsed = z.object({
          limit: z.number().optional().default(5),
        }).parse(args);

        const channelsList = await web.conversations.list({ limit: parsed.limit, exclude_archived: true });
        const activity = [];

        if (channelsList.channels) {
          for (const ch of channelsList.channels) {
            if (ch.id) {
              try {
                const history = await web.conversations.history({ channel: ch.id, limit: 100 });
                const msgCount = history.messages?.length || 0;
                const uniqueUsers = new Set(history.messages?.map(m => m.user).filter(Boolean));
                activity.push({
                  id: ch.id,
                  name: ch.name,
                  message_count: msgCount,
                  active_users_count: uniqueUsers.size,
                });
              } catch (e) {
                activity.push({ id: ch.id, name: ch.name, error: "History permission error" });
              }
            }
          }
        }

        return {
          content: [{ type: "text", text: JSON.stringify(activity) }],
        };
      }

      case "user_activity": {
        const parsed = z.object({
          limit: z.number().optional().default(10),
        }).parse(args);

        const usersList = await web.users.list({ limit: parsed.limit });
        const channelsList = await web.conversations.list({ limit: 5, exclude_archived: true });
        const userCounts: Record<string, { count: number, name: string }> = {};

        if (usersList.members) {
          for (const u of usersList.members) {
            if (u.id) userCounts[u.id] = { count: 0, name: u.real_name || u.name || u.id };
          }
        }

        if (channelsList.channels) {
          for (const ch of channelsList.channels) {
            if (ch.id) {
              try {
                const history = await web.conversations.history({ channel: ch.id, limit: 100 });
                if (history.messages) {
                  for (const msg of history.messages) {
                    if (msg.user && userCounts[msg.user]) {
                      userCounts[msg.user].count++;
                    }
                  }
                }
              } catch (e) {}
            }
          }
        }

        const sortedUsers = Object.entries(userCounts)
          .map(([id, info]) => ({ id, name: info.name, message_count: info.count }))
          .sort((a, b) => b.message_count - a.message_count);

        return {
          content: [{ type: "text", text: JSON.stringify(sortedUsers) }],
        };
      }

      case "thread_metrics": {
        const parsed = z.object({
          channel: z.string(),
        }).parse(args);

        const history = await web.conversations.history({ channel: parsed.channel, limit: 100 });
        let unansweredCount = 0;
        let totalResponseTimeMs = 0;
        let threadedCount = 0;

        if (history.messages) {
          for (const msg of history.messages) {
            // Check if thread exists
            if (msg.thread_ts) {
              if (msg.reply_count && msg.reply_count > 0) {
                try {
                  const replies = await web.conversations.replies({ channel: parsed.channel, ts: msg.thread_ts });
                  if (replies.messages && replies.messages.length > 1) {
                    threadedCount++;
                    const parentTs = parseFloat(replies.messages[0].ts!) * 1000;
                    const firstReplyTs = parseFloat(replies.messages[1].ts!) * 1000;
                    totalResponseTimeMs += (firstReplyTs - parentTs);
                  }
                } catch (e) {}
              } else {
                // If it is a thread parent but no replies
                unansweredCount++;
              }
            } else if (msg.reply_count === undefined || msg.reply_count === 0) {
              // Standalone messages are not thread parents, so we ignore
            }
          }
        }

        const avgResponseTimeSec = threadedCount > 0 ? (totalResponseTimeMs / threadedCount / 1000) : 0;

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              channel: parsed.channel,
              unanswered_threads: unansweredCount,
              average_response_time_seconds: avgResponseTimeSec,
              total_threads_analyzed: threadedCount + unansweredCount,
            })
          }],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: error.message || String(error) }) }],
      isError: true,
    };
  }
});

// Run Server
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Slack MCP server running on stdio");
}

run().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
