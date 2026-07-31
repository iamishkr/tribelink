import React from 'react';

export const metadata = {
  title: 'TribeLink Admin Dashboard',
  description: 'Platform management and moderation dashboard for TribeLink',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
          body { background-color: #0F172A; color: #F8FAFC; }
          a { color: inherit; text-decoration: none; }
          input, button, select { font-family: inherit; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
