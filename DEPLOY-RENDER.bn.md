# 🚀 Render-এ Pulse Chat কিভাবে Run/Deploy দিবেন (বাংলা গাইড)

এই অ্যাপটা **Node.js + WebSocket** দিয়ে বানানো, তাই Render-এ এটা **Web Service** হিসেবে
ডিপ্লয় করতে হবে (Static Site নয়)। ভালো খবর — Render ফ্রি প্ল্যানেও WebSocket সাপোর্ট করে।

---

## ✅ আগে থেকেই যা যা ঠিক করা আছে

কোডে এই দুইটা জিনিস Render-এর জন্য অপরিহার্য, এবং আমি আগেই ঠিক করে রেখেছি:

```js
const PORT = process.env.PORT || 3000;   // Render নিজে PORT দেয়
const HOST = process.env.HOST || '0.0.0.0'; // 0.0.0.0-এ bind করতে হয়
```

আর ফ্রন্টএন্ড অটোমেটিক `wss://` ব্যবহার করে যখন সাইটটা HTTPS-এ চলে:

```js
const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
new WebSocket(`${proto}//${location.host}/ws`);
```

তাই আলাদা করে কিছু বদলানো লাগবে না। 👍

---

## পদ্ধতি ১ — ড্যাশবোর্ড দিয়ে (সবচেয়ে সহজ)

### ধাপ ১: কোড GitHub-এ আছে কিনা দেখুন

কোড ইতোমধ্যে পুশ করা আছে এই ব্রাঞ্চে:

```
mhloloddib-netizen/Testing-Agent  →  ব্রাঞ্চ: arena/01a0eb5a-testing-agent
```

> চাইলে এই ব্রাঞ্চকে `main`-এ merge করে নিতে পারেন, তাহলে Render-এ `main` সিলেক্ট করলেই হবে।

### ধাপ ২: Render-এ অ্যাকাউন্ট খুলুন

[render.com](https://render.com) → **Get Started** → GitHub দিয়ে সাইন আপ করুন
(ক্রেডিট কার্ড লাগবে না)।

### ধাপ ৩: নতুন Web Service বানান

1. ড্যাশবোর্ডে **New +** বাটনে ক্লিক করুন
2. **Web Service** সিলেক্ট করুন
3. আপনার GitHub অ্যাকাউন্ট কানেক্ট করুন → **Testing-Agent** রিপো সিলেক্ট করে **Connect**

### ধাপ ৪: সেটিংস পূরণ করুন

| ফিল্ড              | কী দিবেন                                            |
| ------------------ | --------------------------------------------------- |
| **Name**           | `pulse-chat` (এটাই আপনার URL হবে)                    |
| **Region**         | `Singapore` (বাংলাদেশ থেকে সবচেয়ে কাছে, কম latency) |
| **Branch**         | `arena/01a0eb5a-testing-agent`                       |
| **Root Directory** | খালি রাখুন                                           |
| **Runtime**        | `Node`                                               |
| **Build Command**  | `npm install`                                        |
| **Start Command**  | `npm start`                                          |
| **Instance Type**  | `Free`                                               |

### ধাপ ৫: Environment Variable যোগ করুন (ঐচ্ছিক)

**Advanced** → **Add Environment Variable**:

| Key        | Value        |
| ---------- | ------------ |
| `NODE_ENV` | `production` |

⚠️ **`PORT` নিজে সেট করবেন না** — Render অটোমেটিক দেয়। সেট করলে অ্যাপ ক্র্যাশ করতে পারে।

### ধাপ ৬: Deploy!

**Create Web Service** চাপুন। ২-৩ মিনিটে বিল্ড শেষ হবে। লগে দেখবেন:

```
Chat server running on http://0.0.0.0:10000
==> Your service is live 🎉
```

আপনার অ্যাপ লাইভ: **`https://pulse-chat.onrender.com`**

দুইটা ট্যাবে খুলে আলাদা নামে একই রুমে ঢুকলেই লাইভ চ্যাট কাজ করবে ✨

---

## পদ্ধতি ২ — Blueprint দিয়ে (এক ক্লিকে)

রিপোতে `render.yaml` ফাইল দেওয়া আছে, তাই:

1. Render ড্যাশবোর্ড → **New +** → **Blueprint**
2. **Testing-Agent** রিপো সিলেক্ট করুন
3. **Apply** চাপুন

সব সেটিংস (build command, start command, health check, region) অটোমেটিক নিয়ে নিবে।

---

## 🔄 আপডেট করবেন কিভাবে?

`autoDeploy` চালু আছে, তাই শুধু কোড পুশ করলেই হবে:

```bash
git add -A
git commit -m "my change"
git push origin arena/01a0eb5a-testing-agent
```

Render নিজে নিজেই নতুন ভার্সন বিল্ড করে লাইভ করে দিবে।

---

## ⚠️ ফ্রি প্ল্যানের যেসব সীমাবদ্ধতা জানা দরকার

| বিষয়              | ব্যাখ্যা                                                                 |
| ----------------- | ------------------------------------------------------------------------ |
| **Spin down**     | ১৫ মিনিট কোনো ট্রাফিক না থাকলে সার্ভার ঘুমিয়ে যায়                       |
| **Cold start**    | ঘুম থেকে উঠতে প্রায় ১ মিনিট লাগে — প্রথম ইউজার লোডিং পেজ দেখবে           |
| **WebSocket**     | ফ্রিতে কাজ করে ✅ — এবং WS মেসেজ আসতে থাকলে সার্ভার জেগে থাকে              |
| **মাসিক লিমিট**   | ৭৫০ ঘণ্টা/মাস (একটা সার্ভিসের জন্য যথেষ্ট)                                |
| **RAM**           | ৫১২ MB                                                                    |
| **ডেটা হারানো**   | সার্ভার রিস্টার্ট = সব চ্যাট হিস্ট্রি মুছে যাবে (মেমোরিতে রাখা হয়েছে তো) |
| **Restart**       | Render যেকোনো সময় ফ্রি সার্ভিস রিস্টার্ট দিতে পারে                        |

👉 সবসময় জাগিয়ে রাখতে চাইলে **Starter প্ল্যান ($7/মাস)** নিন — তখন cold start থাকবে না।

---

## 🐞 সমস্যা হলে যা চেক করবেন

**"No open ports detected"**
→ `HOST` অবশ্যই `0.0.0.0` হতে হবে, `localhost` নয়। (আমাদের কোডে ঠিক আছে)

**"Application failed to respond"**
→ আপনি ম্যানুয়ালি `PORT` env var সেট করেছেন কিনা দেখুন — করে থাকলে মুছে দিন।

**WebSocket কানেক্ট হচ্ছে না / বারবার "reconnecting…" দেখাচ্ছে**
→ ব্রাউজার কনসোল দেখুন। `ws://` না হয়ে `wss://` হচ্ছে কিনা নিশ্চিত করুন
(HTTPS সাইটে `ws://` ব্লক হয়ে যায়)। আমাদের কোড এটা অটো হ্যান্ডেল করে।

**Build fail হচ্ছে**
→ Render-এর **Logs** ট্যাব দেখুন। `package-lock.json` কমিট করা আছে কিনা চেক করুন।

**অ্যাপ স্লো / প্রথমবার লোড হয় না**
→ এটা cold start, স্বাভাবিক। ১ মিনিট অপেক্ষা করুন বা পেজ রিফ্রেশ দিন।

---

## 🩺 হেলথ চেক

Render প্রতিবার ডিপ্লয়ের পর `/api/health` চেক করে। ব্রাউজারে গেলে এমন দেখবেন:

```json
{ "ok": true, "rooms": [{ "name": "general", "users": 2, "messages": 14 }] }
```

এটা দেখালেই বুঝবেন সার্ভার ঠিকমতো চলছে ✅
