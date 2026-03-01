import React, { useState } from 'react';
import { Send, MessageSquare, BookOpen, Bug } from 'lucide-react';
import MarketingLayout from '../components/MarketingLayout';
import './MarketingPages.css';

const topics = [
  { value: 'general', label: 'General question' },
  { value: 'support', label: 'Technical support' },
  { value: 'billing', label: 'Billing & plans' },
  { value: 'bug', label: 'Report a bug' },
  { value: 'feature', label: 'Feature request' },
  { value: 'other', label: 'Other' },
];

const contactCards = [
  {
    icon: <MessageSquare size={24} />,
    title: 'General enquiries',
    body: 'Questions about ducky, partnerships, or anything else.',
    email: 'hello@ducky.wtf',
  },
  {
    icon: <BookOpen size={24} />,
    title: 'Support',
    body: 'Need help getting set up or troubleshooting an issue?',
    email: 'support@ducky.wtf',
  },
  {
    icon: <Bug size={24} />,
    title: 'Security',
    body: 'Found a vulnerability? Please disclose responsibly.',
    email: 'security@ducky.wtf',
  },
];

const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('general');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app this would POST to a contact endpoint
    setSubmitted(true);
  };

  return (
    <MarketingLayout>
      <section className="marketing-hero">
        <div className="container">
          <div className="marketing-hero-content">
            <h1 className="marketing-hero-title">Get in touch</h1>
            <p className="marketing-hero-subtitle">
              We're a small team and we read every message. Expect a reply within one business day.
            </p>
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="container">
          <div className="contact-layout">
            <div className="contact-cards">
              {contactCards.map((card) => (
                <div key={card.title} className="contact-card card">
                  <div className="contact-card-icon">{card.icon}</div>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                  <a href={`mailto:${card.email}`} className="contact-email">
                    {card.email}
                  </a>
                </div>
              ))}
            </div>

            <div className="contact-form-wrap card">
              {submitted ? (
                <div className="contact-success">
                  <div className="contact-success-icon">✓</div>
                  <h3>Message sent!</h3>
                  <p>Thanks for reaching out. We'll get back to you within one business day.</p>
                </div>
              ) : (
                <>
                  <h2 style={{ marginBottom: '24px', fontSize: '22px' }}>Send a message</h2>
                  <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="form-group">
                        <label htmlFor="contactName">Name</label>
                        <input
                          id="contactName"
                          type="text"
                          className="input"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          placeholder="Your name"
                          autoComplete="name"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="contactEmail">Email</label>
                        <input
                          id="contactEmail"
                          type="email"
                          className="input"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          placeholder="you@example.com"
                          autoComplete="email"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="contactTopic">Topic</label>
                      <select
                        id="contactTopic"
                        className="input"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                      >
                        {topics.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="contactMessage">Message</label>
                      <textarea
                        id="contactMessage"
                        className="input"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                        placeholder="Tell us what's on your mind..."
                        rows={6}
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary btn-block">
                      <Send size={16} />
                      Send Message
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default ContactPage;
