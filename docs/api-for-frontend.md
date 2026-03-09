# 前端对接 API 说明

供前端/壳程序对接：套餐展示、下单、订单状态、个人统计与明细等。完整入参/出参以 **OpenAPI 文档** 为准。

---

## 1. 基础信息

| 项 | 说明 |
|----|------|
| **Base URL** | 生产：`https://ai-api.fantasy-lab.com`（按实际部署为准） |
| **鉴权** | 除注册/登录外，请求头需带：`Authorization: Bearer <JWT>` |
| **OpenAPI 文档** | 部署后访问：`https://ai-api.fantasy-lab.com/api-docs`（Swagger UI），可在线调试 |
| **OpenAPI JSON** | `GET /api-docs.json` 可导出规范给代码生成或 Postman 导入 |

---

## 2. 用户与登录

| 接口 | 说明 |
|------|------|
| `POST /api/register` | 注册，body: `{ username, password, org_name? }`，返回 token + 用户信息 |
| `POST /api/login` | 登录，body: `{ username, password }`，返回 token + 用户信息 |
| `GET /api/me` | 当前用户信息（user_id、org_id、username），需 JWT |

登录/注册返回中的 `token` 即 JWT，后续请求放在 Header：`Authorization: Bearer <token>`。

---

## 3. 套餐与充值

| 接口 | 说明 |
|------|------|
| `GET /api/recharge/packages` | **套餐列表**（当前上架），需 JWT。返回 `{ items: [{ package_id, name, original_price_cents, current_price_cents, compute_amount }] }` |
| `POST /api/recharge/orders` | **创建订单**（套餐），需 JWT。body: `{ package_id, channel? }`（channel 默认 wechat）。返回订单信息 + `code_url`（用于生成二维码）；若微信未配置则可能有 `wechat_error` |
| `POST /api/recharge/orders-with-qr` | **创建订单并直接返回付款码图片**，需 JWT。body 同上。成功时响应为 **image/png**（可直接展示或保存后扫码），失败为 JSON 错误 |

前端可任选其一：用 `orders` 拿 `code_url` 自己生成二维码，或用 `orders-with-qr` 直接拿 PNG 展示。

---

## 4. 订单状态与充值记录

| 接口 | 说明 |
|------|------|
| `GET /api/recharge/orders/:out_trade_no/status` | **查询订单状态**，需 JWT，仅能查本人订单。路径参数为创建订单返回的 `out_trade_no`。返回 `{ out_trade_no, status, amount_cents, token_delta, channel, created_at }`，供支付页轮询（如每 2～5 秒）直到 status 为 `success` |
| `GET /api/recharge/records` | **当前用户充值记录**，需 JWT。query: `limit`（默认 20）、`offset`（默认 0）。返回 `{ items, total }`，每条含订单号、金额、状态、创建时间等 |

---

## 5. 个人统计与明细（算力/额度）

| 接口 | 说明 |
|------|------|
| `GET /api/me/compute-balance` | **算力余额与统计**，需 JWT。返回 `compute_balance`（剩余算力积分）、`valid_until`（有效期至）、`today_consumption`、`month_total_consumption`、`month_avg_consumption`、`token_equivalent`（折算 token） |
| `GET /api/me/compute-ledger` | **算力流水**，需 JWT。query: `limit`、`offset`。返回 `{ items, total }`，每条含 `delta_compute`（消耗/充值）、`balance_after`（该笔后剩余）、`task_name`、`type`、`created_at` 等 |
| `GET /api/me/newapi-token` | **NewAPI 令牌**，需 JWT。自动创建或返回已有令牌，返回 `newapi_base_url`、`newapi_token`，供调用大模型等 |
| `GET /api/me/usage` | **用量概览**，需 JWT（若已实现） |

---

## 6. 前端对接建议顺序

1. **登录/注册** → 拿到 JWT，后续所有请求带 `Authorization: Bearer <token>`。
2. **套餐展示** → `GET /api/recharge/packages`，渲染套餐列表（名称、现价、算力等）。
3. **下单** → `POST /api/recharge/orders` 或 `POST /api/recharge/orders-with-qr`，拿到 `out_trade_no` 与付款方式（code_url 或 PNG）。
4. **轮询订单状态** → `GET /api/recharge/orders/:out_trade_no/status`，直到 `status === 'success'`（或 failed/closed）后停止轮询并提示。
5. **个人中心** → `GET /api/me/compute-balance` 展示余额与统计；`GET /api/me/compute-ledger` 展示流水；`GET /api/recharge/records` 展示充值记录。

---

## 7. 错误与状态码

- `401`：未带 token 或 token 无效/过期，需重新登录。
- `400`：参数错误或业务校验失败，body 中常有 `error`、`message`。
- `404`：如查询订单状态时订单不存在或非本人订单。
- 业务错误时响应体为 JSON，例如：`{ "error": "recharge_error", "message": "套餐不存在或已下架" }`。

完整字段与错误码以 **OpenAPI 文档**（`/api-docs`）为准。
