const routeMapCache = new Map<string, string>()

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

const server = Bun.serve({
  port: process.env.PORT || 3000,
  hostname: "0.0.0.0",
  routes: {
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
        logger.info('添加新路由', { path: body.path })
        routeMapCache.set(body.path, body.response)
        return new Response(JSON.stringify({ success: true }))
      },
      DELETE: async (req) => {
        const body = await req.json()
        logger.info('删除路由', { path: body.path })
        routeMapCache.delete(body.path)
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