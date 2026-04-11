# Forgiven AI Commerce OS — Run Your Business with AI

Forgiven AI Commerce OS is a complete AI-powered commerce operating system designed specifically for fashion and lifestyle brands. It streamlines and automates the core pillars of a modern commerce business: products, content, sales, and fulfillment.

## 🚀 Vision

Empowering brands to scale through intelligent automation. Our platform integrates advanced AI to handle the heavy lifting, allowing creative teams to focus on brand identity and customer experience.

## ✨ Key Features

- **Automated Product Management**: Effortlessly manage and synchronize your product catalog across multiple channels.
- **AI Content Generation**: Generate high-quality marketing copy, product descriptions, and social media content tailored to your brand voice.
- **Intelligent Sales Analytics**: Gain deep insights into customer behavior and sales trends with AI-driven reporting.
- **Seamless Fulfillment**: Streamline your order processing and logistics for a faster, more reliable customer experience.

## 🛠️ Technology Stack

- **Frontend**: React, Vite, TypeScript
- **Styling**: Tailwind CSS, Radix UI (shadcn/ui)
- **Backend**: Supabase (Database, Auth, Edge Functions)
- **AI Integration**: Gemini / OpenAI (configurable)
- **Testing**: Vitest, Playwright

## 🏁 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Bun](https://bun.sh/) or [npm](https://www.npmjs.com/)

### Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/your-username/forgivenai-commerce-main.git
   cd forgivenai-commerce-main
   ```

2. Install dependencies:
   ```sh
   bun install
   # or
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. Run the development server:
   ```sh
   bun dev
   # or
   npm run dev
   ```

The application will be available at `http://localhost:8080`.

## 📖 Component Library

This project uses **shadcn/ui** for high-quality, accessible components. You can add new components using:
```sh
npx shadcn-ui@latest add [component-name]
```

## 🧪 Testing

- **Unit Tests**: `npm run test`
- **End-to-End Tests**: `npx playwright test`

## 📄 License

This project is licensed under the MIT License.
