# 自动部署指南（GitHub Actions → Cloud Run）

> 背景：Google AI Studio 的 GitHub 同步只能**网页手动点 Pull**，没有“自动拉取 GitHub 更改”的代码接口。
> 本方案改用 **GitHub Actions**：你（或助手）把代码推到 `main` 分支，GitHub 自动构建镜像并部署到 Cloud Run，
> 实现“**代码一推就自动上线**”，彻底摆脱手动 Pull / Deploy。

---

## 一、前提条件
- 一个 **Google Cloud 项目**（需绑定计费账号，Cloud Run 不在 AI Studio 免费额度内）
- 你对该项目有 **Owner / Editor** 权限
- 代码已在 GitHub `MapleU123/guxi`（已满足）

## 二、GCP 准备（一次性）
1. 打开 [Google Cloud Console](https://console.cloud.google.com)，选好你的项目
2. 启用 API（搜索并启用）：
   - **Cloud Run Admin API**
   - **Artifact Registry API**
   - **Cloud Build API**（GitHub Actions 用 gcloud 直接部署，但启用以备不时之需）
3. **创建 Service Account**（IAM → 服务账号 → 创建）：
   - 名称随意，如 `github-deployer`
   - 赋角色：**Cloud Run Admin** + **Artifact Registry Administrator** + **Service Account User**
4. 在该服务账号里 **生成密钥（JSON）**，下载保存好（这就是后面要填的 `GCP_SA_KEY`）

## 三、GitHub Secrets 配置
仓库 `Settings → Secrets and variables → Actions → New repository secret`，逐个添加：

| Secret 名 | 说明 | 示例 |
|---|---|---|
| `GCP_PROJECT_ID` | 你的 GCP 项目 ID | `my-guxi-project` |
| `GCP_REGION` | Cloud Run 区域 | `asia-east1`（推荐离国内近） |
| `GCP_SA_KEY` | 上一步下载的 JSON **全部内容** | `{ "type": "service_account", ... }` |
| `GEMINI_API_KEY` | Gemini API Key（原先 AI Studio 自动注入，现在需自带） | `AIza...` |
| `SITE_URL` | 网站对外地址（部署后 Cloud Run 会给一个 `https://guxi-xxx.run.app`，填这个；也可填你自己的域名） | `https://guxi-xxx.run.app` |
| `WECHAT_MP_APP_ID` | 微信公众号 AppID | `wx...` |
| `WECHAT_MP_APP_SECRET` | 微信公众号 AppSecret | `...` |
| `WECHAT_MP_TOKEN` | 公众号 Token（不填则用代码默认 `a_share_dividend_wechat_token`） | `1579eb55...` |
| `WECHAT_MP_AES_KEY` | 安全模式 EncodingAESKey（明文模式可留空） | ``（空） |
| `WECHAT_MP_CODE_SECRET` | 配对码密钥（不填则用默认） | ``（空） |
| `WECHAT_MP_ORIGINAL_ID` | 公众号原始 ID | `gh_7d39de02f610` |
| `WECHAT_MP_SUB_TEMPLATE_STOCK` | 订阅消息模板 ID（主动推送用，没有可留空） | ``（空） |

> 说明：环境变量在 `server.ts` / `wechatService.ts` 里用 `process.env.*` 读取，默认值已写好，
> 所以可选项留空也能跑（走默认）。但 `GEMINI_API_KEY`、`WECHAT_MP_APP_ID`、`WECHAT_MP_APP_SECRET`、`SITE_URL` 建议必填。

## 四、触发部署
- **首次**：把本仓库（含 `Dockerfile`、`deploy.yml`）推到 `main` → 到 `Actions` 页面看 `Deploy to Cloud Run` 是否跑绿。
- **之后**：任何推到 `main` 的提交都会**自动重新部署**，无需再进 AI Studio。

部署成功后，Cloud Run 会给出一个服务 URL（如 `https://guxi-xxxx.run.app`）。

## 五、上线后必做：更新微信后台
因为部署目标从 AI Studio 变成了你自己的 Cloud Run，需要把公众号指向新地址：
1. **公众号 → 设置与开发 → 基本配置 → 服务器地址(URL)**
   改为：`https://<你的CloudRun域名>/api/wechat/webhook`
   （Token 与后台一致；若之前用默认 token，保持默认即可）
2. **公众号 → 公众号设置 → 功能设置**：
   - 业务域名、JS接口安全域名、网页授权域名：把新 Cloud Run 域名加进去（AI Studio 旧域名可保留或替换）
3. 若你启用了自定义域名，把 `SITE_URL` 改成自定义域名并重新部署一次。

## 六、验证
部署后在本仓库 `Actions` 看日志；或本地用 curl 测线上：
```bash
curl -m 10 https://<你的CloudRun域名>/api/health
# 应返回 200
# 再测公众号关键词：发“群”应返回带 media_id 的图片 XML
```

## 七、回退 / 备注
- 若 Cloud Run 部署失败，旧 AI Studio 部署（`a-studio-1816.ai.studio`）仍可保留作为兜底，直到新部署验证通过。
- 费用：Cloud Run 按请求计费，低流量几乎免费；但需绑定计费账号。
- 镜像推到 Artifact Registry（`guxi/guxi` 仓库），workflow 首次会自动创建该仓库。
