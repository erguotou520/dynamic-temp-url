const routeMapCache = new Map<string, string>()
const routeTimers = new Map<string, NodeJS.Timeout>()

// 日志工具函数
const logger = (() => {
  const createLogFn = (level: 'INFO' | 'ERROR', logFn: typeof console.log) => {
    return (message: string, data?: Record<string, unknown>) => {
      const timestamp = new Date().toISOString()
      logFn(`[${timestamp}] ${level}: ${message}`, data ? JSON.stringify(data) : '')
    }
  }

  return {
    info: createLogFn('INFO', console.log),
    error: createLogFn('ERROR', console.error)
  }
})()

// 删除路由的辅助函数
const deleteRoute = (path: string, manual = true) => {
  routeMapCache.delete(path)
  const timer = routeTimers.get(path)
  if (timer) {
    clearTimeout(timer)
    routeTimers.delete(path)
  }
  logger.info('路由已删除', { path, manual })
}

const server = Bun.serve({
  port: process.env.PORT || 3000,
  hostname: "0.0.0.0",
  routes: {
    '/_health': {
      GET: () => {
        return new Response('ok')
      }
    },
    '/_manage': {
      GET: () => {
        logger.info('访问管理页面')
        return new Response(Bun.file('index.html'))
      }
    },
    '/_manage/routes': {
      GET: () => {
        logger.info('获取所有路由')
        return new Response(JSON.stringify(Object.fromEntries(routeMapCache)))
      },
      POST: async (req) => {
        const body = await req.json()
        const path = body.path
        const response = body.response
        const ttl = body.ttl || 600 // 默认10分钟（600秒）

        // 如果路由已存在，先清除旧的定时器
        if (routeMapCache.has(path)) {
          deleteRoute(path, false)
        }

        // 设置新路由
        routeMapCache.set(path, response)
        logger.info('添加新路由', { path, ttl })

        // 设置自动删除定时器
        const timer = setTimeout(() => {
          deleteRoute(path, false)
        }, ttl * 1000)
        routeTimers.set(path, timer)

        return new Response(JSON.stringify({ success: true }))
      },
      DELETE: async (req) => {
        const body = await req.json()
        deleteRoute(body.path, true)
        return new Response(JSON.stringify({ success: true }))
      }
    }
  },
  fetch(req) {
    const url = new URL(req.url)
    const path = url.pathname.replace(/^\//, '')
    const route = routeMapCache.get(path)
    
    if (route) {
      logger.info('路由匹配成功', { path })
      return new Response(route)
    }
    
    logger.info('路由未找到', { path })
    return new Response("Not Found", { status: 404 })
  }
})

logger.info("服务器启动成功", { url: server.url })