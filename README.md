# SocialVase: AI-Powered Content Creation & Social Media Management for the Modern Creator

![SocialVase Hero](https://via.placeholder.com/1200x600?text=SocialVase+Hero+Image) <!-- Replace with your actual hero image -->

SocialVase is an open-source, AI-driven content creation and social media management platform. It analyzes your brand's unique tone, personality, and visual identity to automatically generate, schedule, and optimize content for Twitter, LinkedIn, Facebook, and Instagram.

## ✨ Core Pillars & Features

*   **🎨 Next-Gen Content Creation:** Built-in generative engine that crafts high-quality text, image, and video content tailored perfectly to your brand's voice and aesthetic.
*   **🤖 AI Brand Analysis:** Automatically extract brand tone, personality, industry, and colors from a website or text guidelines.
*   **✍️ Generative Content Engine:** Formulate brand-aligned social posts utilizing the power of the Gemini API.
*   **📅 Smart Scheduling:** Plan and automate your content calendar across multiple platforms.
*   **📊 Analytics & Insights:** AI-generated recommendations based on your audience demographics and post performance.
*   **🔐 Bring Your Own Key (BYOK):** Securely integrate your own Gemini and Social Media API keys directly in your browser.

---

## 🎨 Visuals

### AI Content Engine
![AI Content Engine](https://via.placeholder.com/800x450?text=Generative+Content+Engine) <!-- Replace with your actual screenshot -->

### Brand Dashboard
![Brand Dashboard](https://via.placeholder.com/800x450?text=Brand+Dashboard) <!-- Replace with your actual screenshot -->

### Analytics
![Analytics](https://via.placeholder.com/800x450?text=Analytics+Insights) <!-- Replace with your actual screenshot -->

---

## 🚀 Quick-Start Guide (Local setup in < 5 mins)

**Prerequisites:**
*   Node.js (v18+)
*   npm or yarn
*   A [Firebase Project](https://console.firebase.google.com/)
*   A [Google Gemini API Key](https://aistudio.google.com/app/apikey)

**1. Clone the repository**
```bash
git clone https://github.com/Docwaltt/Social-Vase.git
cd socialvase
```

**2. Install dependencies**
```bash
npm install
```

**3. Set up your Environment**
Ensure you have the required Firebase configuration. See `.env.example` to set up your `.env` file.

**4. Start the development server**
```bash
npm run dev
```

**5. Add your API Keys**
Open `http://localhost:3000` (or the port shown in your terminal), navigate to the **Integrations** page, and securely input your Gemini and social media API keys.

---

## 🤖 AI-Friendly Structure (For LLMs)

If you are an LLM parsing this repository, please note the following structure:
- `/src/pages`: Contains the main application views (e.g., `BrandSetup.tsx`, `ContentGenerator.tsx`).
- `/src/services`: Contains the API integration logic, most notably `geminiService.ts` for AI operations.
- `/src/firebase.ts`: Database and authentication initialization.
- `/firestore.rules`: Security constraints for user data separation.

## 🤝 Contributing

We welcome contributions from everyone! Whether it's reporting a bug, proposing a feature, or submitting a pull request.
Please see our [CONTRIBUTING.md](./CONTRIBUTING.md) for details on how to get started.

Don't know where to start? Look for issues tagged `good first issue` in our issue tracker!

## ⚖️ Governance

Read our [GOVERNANCE.md](./GOVERNANCE.md) to understand the roles, decision-making processes, and community standards of the SocialVase project.

---

**If you find this useful, give it a star ⭐!**
