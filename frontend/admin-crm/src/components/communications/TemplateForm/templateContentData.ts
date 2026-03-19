import type { TemplateStarter } from '@/types/templates.types';

export const templateContentData: Record<string, { subject: string; body: string }> = {
  welcome: {
    subject: 'Welcome to {{ site_name }}!',
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #1976d2; color: white; padding: 24px; text-align: center;">
    <h1>Welcome to {{ site_name }}!</h1>
  </div>

  <div style="padding: 24px;">
    <h2>Hello {{ first_name }}!</h2>

    <p>Thank you for joining {{ site_name }}. We're excited to help you manage your events and create memorable experiences.</p>

    <p>If you have any questions, feel free to contact our support team.</p>

    <div style="text-align: center; margin: 24px 0;">
      <a href="{{ login_link }}" style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
        Get Started
      </a>
    </div>
  </div>
</div>`,
  },
  reminder: {
    subject: 'Reminder: {{ event_name }}',
    body: `<p>Hello <strong>{{ first_name }}</strong>,</p>

<p>This is a friendly reminder about your upcoming event:</p>

<ul>
  <li><strong>Event:</strong> {{ event_name }}</li>
  <li><strong>Date:</strong> {{ event_date }}</li>
  <li><strong>Location:</strong> {{ venue }}</li>
</ul>

<p>We're looking forward to working with you!</p>

<p>Best regards,<br>
The {{ site_name }} Team</p>`,
  },
  followup: {
    subject: 'Thank you for choosing {{ site_name }}',
    body: `<p>Dear <strong>{{ first_name }}</strong>,</p>

<p>Thank you for allowing us to be part of your special event. We hope everything went perfectly!</p>

<p>We'd love to hear about your experience. If you have a moment, please let us know how we did.</p>

<p>We look forward to working with you again in the future.</p>

<p>Best regards,<br>
The {{ site_name }} Team</p>`,
  },
  sms_reminder: {
    subject: '',
    body: `Hi {{ first_name }}! Reminder: {{ event_name }} on {{ event_date }} at {{ venue }}. Looking forward to working with you! - {{ site_name }}`,
  },
  sms_confirmation: {
    subject: '',
    body: `Hi {{ first_name }}! Your booking for {{ event_name }} is confirmed for {{ event_date }}. We'll be in touch soon! - {{ site_name }}`,
  },
};

export const getTemplateStarters = (channel: string): Record<string, TemplateStarter> => {
  if (channel === 'SMS') {
    return {
      sms_reminder: {
        name: 'SMS Reminder',
        description: 'A short reminder message for upcoming events',
      },
      sms_confirmation: {
        name: 'SMS Confirmation',
        description: 'Confirm a booking or appointment',
      },
    };
  }

  return {
    welcome: {
      name: 'Welcome Email',
      description: 'Welcomes new users to the platform with a branded template',
    },
    reminder: {
      name: 'Event Reminder',
      description: 'Reminds clients about upcoming events with event details',
    },
    followup: {
      name: 'Follow-up Email',
      description: 'Thanks clients after an event and invites feedback',
    },
  };
};
