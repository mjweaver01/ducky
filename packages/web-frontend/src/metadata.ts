/**
 * Metadata helper to update document title and meta description
 */

interface MetadataOptions {
  title: string;
  description?: string;
  url?: string;
  image?: string;
}

function updateMetaTag(name: string, content: string): void {
  let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', name);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

function updateOgTag(property: string, content: string): void {
  let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('property', property);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

export function updateMetadata({ title, description, url, image }: MetadataOptions): void {
  document.title = title;

  if (description) {
    updateMetaTag('description', description);
    updateOgTag('og:description', description);
    updateMetaTag('twitter:description', description);
  }

  updateOgTag('og:title', title);
  updateMetaTag('twitter:title', title);

  if (url) {
    updateOgTag('og:url', url);
  } else {
    updateOgTag('og:url', window.location.href);
  }

  if (image) {
    updateOgTag('og:image', image);
    updateMetaTag('twitter:image', image);
  }
}

export const pageMetadata = {
  home: {
    title: 'Secure Tunnels to Localhost • ducky.wtf',
    description:
      'Expose your local server to the internet with secure tunnels. Perfect for webhooks, demos, and development.',
  },
  pricing: {
    title: 'Pricing • ducky.wtf',
    description: 'Simple, transparent pricing for developers. Choose the plan that works for you.',
  },
  about: {
    title: 'About • ducky.wtf',
    description: 'Learn about ducky and our mission to make localhost accessible to the internet.',
  },
  contact: {
    title: 'Contact • ducky.wtf',
    description: "Get in touch with the ducky.wtf team. We'd love to hear from you.",
  },
  terms: {
    title: 'Terms of Service • ducky.wtf',
    description: 'Terms of service and usage policy for ducky tunnels.',
  },
  docs: {
    title: 'Documentation • ducky.wtf',
    description: 'Complete documentation for the ducky CLI, API, and tunnel features.',
  },
  docsIntro: {
    title: 'Introduction • ducky.wtf Docs',
    description:
      'Get started with ducky tunnels. Learn how to expose your local server to the internet.',
  },
  docsCli: {
    title: 'CLI Reference • ducky.wtf Docs',
    description:
      'Complete CLI reference for ducky. All commands, flags, and configuration options.',
  },
  docsApi: {
    title: 'API Reference • ducky.wtf Docs',
    description:
      'REST API documentation for ducky. Manage tunnels, tokens, and domains programmatically.',
  },
  login: {
    title: 'Log In • ducky.wtf',
    description: 'Log in to your ducky account to manage tunnels and settings.',
  },
  signup: {
    title: 'Sign Up • ducky.wtf',
    description: 'Create your free ducky account and start tunneling in minutes.',
  },
  dashboard: {
    title: 'Dashboard • ducky.wtf',
    description: 'Manage your tunnels, tokens, and settings from the ducky dashboard.',
  },
  forgotPassword: {
    title: 'Forgot Password • Ducky.wtf',
    description: 'Reset your Ducky.wtf account password',
  },
  resetPassword: {
    title: 'Reset Password • Ducky.wtf',
    description: 'Create a new password for your Ducky.wtf account',
  },
} as const;
