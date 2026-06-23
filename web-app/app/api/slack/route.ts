import { NextRequest, NextResponse } from 'next/server'
import { WebClient } from '@slack/web-api'
import { z, ZodError } from 'zod'

function getClient(): WebClient {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) throw new Error('SLACK_BOT_TOKEN environment variable is not set')
  return new WebClient(token)
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { tool, ...args } = body as { tool?: string } & Record<string, unknown>
  if (!tool) {
    return NextResponse.json({ error: 'Missing required field: tool' }, { status: 400 })
  }

  try {
    const web = getClient()
    const result = await dispatch(web, tool, args)
    return NextResponse.json(result)
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Invalid parameters', details: err.errors }, { status: 400 })
    }
    const msg = err instanceof Error ? err.message : String(err)
    const status = msg.includes('SLACK_BOT_TOKEN') ? 503 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

async function dispatch(web: WebClient, tool: string, args: Record<string, unknown>) {
  switch (tool) {
    case 'list_channels': {
      const { types, limit } = z.object({
        types: z.string().optional().default('public_channel,private_channel'),
        limit: z.number().optional().default(100),
      }).parse(args)

      try {
        const res = await web.conversations.list({ types, limit, exclude_archived: true })
        return res.channels ?? []
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : ''
        if (msg.includes('missing_scope') && types.includes('private_channel')) {
          const res = await web.conversations.list({ types: 'public_channel', limit, exclude_archived: true })
          return res.channels ?? []
        }
        throw err
      }
    }

    case 'get_channel_messages': {
      const { channel, limit, cursor } = z.object({
        channel: z.string(),
        limit: z.number().optional().default(50),
        cursor: z.string().optional(),
      }).parse(args)

      const res = await web.conversations.history({ channel, limit, cursor })
      return res.messages ?? []
    }

    case 'search_messages': {
      const { query, count } = z.object({
        query: z.string(),
        count: z.number().optional().default(20),
      }).parse(args)

      try {
        const res = await web.search.messages({ query, count })
        return res.messages?.matches ?? []
      } catch {
        const channelsRes = await web.conversations.list({ limit: 20 })
        const matches: unknown[] = []
        for (const ch of channelsRes.channels ?? []) {
          if (ch.id) {
            try {
              const history = await web.conversations.history({ channel: ch.id, limit: 100 })
              const filtered = (history.messages ?? [])
                .filter(m => m.text?.toLowerCase().includes(query.toLowerCase()))
                .map(m => ({ ...m, channel: { id: ch.id, name: ch.name } }))
              matches.push(...filtered)
            } catch {}
          }
        }
        return matches.slice(0, count)
      }
    }

    case 'get_thread': {
      const { channel, thread_ts } = z.object({
        channel: z.string(),
        thread_ts: z.string(),
      }).parse(args)

      const res = await web.conversations.replies({ channel, ts: thread_ts })
      return res.messages ?? []
    }

    case 'get_user': {
      const { user } = z.object({ user: z.string() }).parse(args)
      const res = await web.users.info({ user })
      return res.user ?? null
    }

    case 'list_users': {
      const { limit } = z.object({ limit: z.number().optional().default(100) }).parse(args)
      const res = await web.users.list({ limit })
      return res.members ?? []
    }

    case 'get_files': {
      const { channel, user, limit } = z.object({
        channel: z.string().optional(),
        user: z.string().optional(),
        limit: z.number().optional().default(20),
      }).parse(args)

      const res = await web.files.list({ channel, user, count: limit })
      return res.files ?? []
    }

    case 'send_message': {
      const { channel, text } = z.object({
        channel: z.string(),
        text: z.string(),
      }).parse(args)

      const res = await web.chat.postMessage({ channel, text })
      return { success: res.ok, ts: res.ts, channel: res.channel }
    }

    case 'reply_to_thread': {
      const { channel, thread_ts, text } = z.object({
        channel: z.string(),
        thread_ts: z.string(),
        text: z.string(),
      }).parse(args)

      const res = await web.chat.postMessage({ channel, thread_ts, text })
      return { success: res.ok, ts: res.ts, channel: res.channel }
    }

    case 'create_channel_post': {
      const { channel, text, blocks: blocksRaw } = z.object({
        channel: z.string(),
        text: z.string(),
        blocks: z.string().optional(),
      }).parse(args)

      let blocks: unknown
      if (blocksRaw) {
        try { blocks = JSON.parse(blocksRaw) } catch {}
      }

      const res = await web.chat.postMessage({ channel, text, blocks: blocks as never })
      return { success: res.ok, ts: res.ts, channel: res.channel }
    }

    case 'send_dm': {
      const { user_id, text } = z.object({
        user_id: z.string(),
        text: z.string(),
      }).parse(args)

      const openRes = await web.conversations.open({ users: user_id })
      if (!openRes.ok || !openRes.channel?.id) {
        throw new Error('Could not open DM channel with user')
      }

      const res = await web.chat.postMessage({ channel: openRes.channel.id, text })
      return { success: res.ok, ts: res.ts, channel: res.channel }
    }

    case 'channel_activity': {
      const { limit } = z.object({ limit: z.number().optional().default(5) }).parse(args)

      const channelsList = await web.conversations.list({ limit, exclude_archived: true })
      const activity = []

      for (const ch of channelsList.channels ?? []) {
        if (ch.id) {
          try {
            const history = await web.conversations.history({ channel: ch.id, limit: 100 })
            const msgs = history.messages ?? []
            const uniqueUsers = new Set(msgs.map(m => m.user).filter(Boolean))
            activity.push({ id: ch.id, name: ch.name, message_count: msgs.length, active_users_count: uniqueUsers.size })
          } catch {
            activity.push({ id: ch.id, name: ch.name, error: 'History permission error' })
          }
        }
      }

      return activity
    }

    case 'user_activity': {
      const { limit } = z.object({ limit: z.number().optional().default(10) }).parse(args)

      const [usersList, channelsList] = await Promise.all([
        web.users.list({ limit }),
        web.conversations.list({ limit: 5, exclude_archived: true }),
      ])

      const userCounts: Record<string, { count: number; name: string }> = {}
      for (const u of usersList.members ?? []) {
        if (u.id) userCounts[u.id] = { count: 0, name: u.real_name || u.name || u.id }
      }

      for (const ch of channelsList.channels ?? []) {
        if (ch.id) {
          try {
            const history = await web.conversations.history({ channel: ch.id, limit: 100 })
            for (const msg of history.messages ?? []) {
              if (msg.user && userCounts[msg.user]) userCounts[msg.user].count++
            }
          } catch {}
        }
      }

      return Object.entries(userCounts)
        .map(([id, info]) => ({ id, name: info.name, message_count: info.count }))
        .sort((a, b) => b.message_count - a.message_count)
    }

    case 'thread_metrics': {
      const { channel } = z.object({ channel: z.string() }).parse(args)

      const history = await web.conversations.history({ channel, limit: 100 })
      let unansweredCount = 0
      let totalResponseTimeMs = 0
      let threadedCount = 0

      for (const msg of history.messages ?? []) {
        if (msg.thread_ts) {
          if (msg.reply_count && msg.reply_count > 0) {
            try {
              const replies = await web.conversations.replies({ channel, ts: msg.thread_ts })
              const replyMsgs = replies.messages ?? []
              if (replyMsgs.length > 1) {
                threadedCount++
                const parentTs = parseFloat(replyMsgs[0].ts!) * 1000
                const firstReplyTs = parseFloat(replyMsgs[1].ts!) * 1000
                totalResponseTimeMs += firstReplyTs - parentTs
              }
            } catch {}
          } else {
            unansweredCount++
          }
        }
      }

      return {
        channel,
        unanswered_threads: unansweredCount,
        average_response_time_seconds: threadedCount > 0 ? totalResponseTimeMs / threadedCount / 1000 : 0,
        total_threads_analyzed: threadedCount + unansweredCount,
      }
    }

    default:
      throw new Error(`Unknown tool: ${tool}`)
  }
}
