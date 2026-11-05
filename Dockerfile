# ---- 构建阶段：安装依赖并构建前端 + 打包 server ----
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json ./
RUN bun install
COPY . .
RUN bun run build

# ---- 运行阶段 ----
FROM oven/bun:1 AS runtime
WORKDIR /app
COPY package.json ./
RUN bun install --production
COPY --from=build /app/dist ./dist
COPY --from=build /app/wechat ./wechat
EXPOSE 8080
ENV PORT=8080
CMD ["bun", "dist/server.cjs"]
